from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.core.database import get_db
from app.models import Match, Prediction, ValueBet
from app.schemas.common import AnalyticsOut, RoiTrendPointOut
from app.services.analytics import (
    PredictionSnapshot,
    SettledBetSnapshot,
    build_roi_trend,
    compute_accuracy,
    compute_roi,
)

router = APIRouter()


def _latest_prediction(match: Match) -> Prediction | None:
    if not match.predictions:
        return None
    return max(match.predictions, key=lambda prediction: prediction.created_at)


@router.get("", response_model=AnalyticsOut)
def get_analytics(db: Session = Depends(get_db)) -> AnalyticsOut:
    """Model performance and ROI of value bets (PP: GET /analytics)."""
    value_bets = db.execute(select(ValueBet)).scalars().all()
    settled_snapshots = [
        SettledBetSnapshot(
            profit=value_bet.profit or 0.0,
            recommended_stake=value_bet.recommended_stake,
            created_at=value_bet.created_at,
        )
        for value_bet in value_bets
        if value_bet.settled and value_bet.profit is not None
    ]

    finished_matches = (
        db.execute(
            select(Match)
            .options(joinedload(Match.predictions))
            .where(
                Match.home_goals.is_not(None),
                Match.away_goals.is_not(None),
            )
        )
        .unique()
        .scalars()
        .all()
    )

    prediction_snapshots: list[PredictionSnapshot] = []
    for match in finished_matches:
        latest_prediction = _latest_prediction(match)
        if latest_prediction is None:
            continue
        prediction_snapshots.append(
            PredictionSnapshot(
                prob_home=latest_prediction.prob_home,
                prob_draw=latest_prediction.prob_draw,
                prob_away=latest_prediction.prob_away,
                home_goals=match.home_goals,
                away_goals=match.away_goals,
            )
        )

    roi_trend = build_roi_trend(settled_snapshots)

    roi_trend_points = [
        RoiTrendPointOut(date=point.date, roi=point.roi) for point in roi_trend
    ]

    return AnalyticsOut(
        accuracy=compute_accuracy(prediction_snapshots),
        log_loss=None,
        roi=compute_roi(settled_snapshots),
        total_value_bets=len(value_bets),
        settled_value_bets=len(settled_snapshots),
        roi_trend=roi_trend_points,
    )
