from __future__ import annotations

from datetime import datetime, timedelta

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.cache import set_cache_headers
from app.core.database import get_db
from app.models import Match, ValueBet
from app.schemas.common import DashboardOut, ValueBetOut
from app.services.analytics import (
    active_model_metrics,
    compute_accuracy,
    compute_roi,
    get_model_metrics,
)

router = APIRouter()


@router.get("", response_model=DashboardOut, dependencies=[Depends(set_cache_headers)])
def get_dashboard(db: Session = Depends(get_db)) -> DashboardOut:
    """Summary overview for the dashboard (PP: GET /dashboard)."""
    now = datetime.utcnow()
    start_of_day = datetime(now.year, now.month, now.day)
    end_of_day = start_of_day + timedelta(days=1)

    matches_today = db.execute(
        select(func.count(Match.id)).where(
            Match.kickoff >= start_of_day, Match.kickoff < end_of_day
        )
    ).scalar_one()

    upcoming = db.execute(
        select(func.count(Match.id)).where(Match.kickoff >= now)
    ).scalar_one()

    latest_kickoff = db.execute(select(func.max(Match.kickoff))).scalar_one()

    upcoming_value_bets = db.execute(
        select(func.count(ValueBet.id))
        .join(Match, ValueBet.match_id == Match.id)
        .where(Match.kickoff >= now)
    ).scalar_one()

    top_bets = (
        db.execute(
            select(ValueBet)
            .join(Match, ValueBet.match_id == Match.id)
            .where(Match.kickoff >= now)
            .order_by(ValueBet.edge.desc())
            .limit(5)
        )
        .scalars()
        .all()
    )

    prediction_snapshots, settled_snapshots = get_model_metrics(db)

    model_metrics = active_model_metrics()
    if model_metrics is not None:
        model_accuracy = model_metrics.get("accuracy")
        confident_accuracy = model_metrics.get("confident_accuracy")
        confident_coverage = model_metrics.get("confident_coverage")
        confidence_threshold = model_metrics.get("confidence_threshold")
    else:
        model_accuracy = compute_accuracy(prediction_snapshots)
        confident_accuracy = confident_coverage = confidence_threshold = None

    return DashboardOut(
        matches_today=matches_today,
        upcoming_matches=upcoming,
        upcoming_value_bets=upcoming_value_bets,
        latest_kickoff=latest_kickoff,
        top_value_bets=[ValueBetOut.model_validate(v) for v in top_bets],
        model_accuracy=model_accuracy,
        roi=compute_roi(settled_snapshots),
        confident_accuracy=confident_accuracy,
        confident_coverage=confident_coverage,
        confidence_threshold=confidence_threshold,
    )
