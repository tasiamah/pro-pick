from __future__ import annotations

from datetime import UTC, datetime

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.cache import set_cache_headers
from app.core.config import settings
from app.core.database import get_db
from app.models import ValueBet
from app.schemas.common import (
    AnalyticsOut,
    PredictionOutcomesOut,
    RiskDistributionOut,
    RoiTrendPointOut,
)
from app.services.analytics import (
    active_model_metrics,
    build_confidence_trend,
    build_prediction_outcome_counts,
    build_roi_trend,
    build_risk_distribution,
    compute_accuracy,
    compute_avg_confidence,
    compute_log_loss,
    compute_roi,
    count_high_confidence_predictions,
    count_predictions_for_today,
    get_model_metrics,
    load_latest_prediction_probabilities,
    load_recent_prediction_probabilities,
)

router = APIRouter()


@router.get("", response_model=AnalyticsOut, dependencies=[Depends(set_cache_headers)])
def get_analytics(db: Session = Depends(get_db)) -> AnalyticsOut:
    """Model performance and ROI of value bets (PP: GET /analytics)."""
    total_value_bets = db.execute(select(func.count(ValueBet.id))).scalar_one()
    prediction_snapshots, settled_snapshots = get_model_metrics(db)
    roi_trend = build_roi_trend(settled_snapshots)

    latest_predictions = load_latest_prediction_probabilities(db)
    recent_predictions = load_recent_prediction_probabilities(db)
    confidence_trend = build_confidence_trend(recent_predictions)
    outcome_counts = build_prediction_outcome_counts(latest_predictions)
    risk_counts = build_risk_distribution(db)
    today = datetime.now(UTC).date()
    predictions_today = count_predictions_for_today(db, today)

    model_metrics = active_model_metrics()
    if model_metrics is not None:
        accuracy = model_metrics.get("accuracy")
        log_loss = model_metrics.get("log_loss")
        confident_accuracy = model_metrics.get("confident_accuracy")
        confident_coverage = model_metrics.get("confident_coverage")
        confidence_threshold = model_metrics.get("confidence_threshold")
    else:
        accuracy = compute_accuracy(prediction_snapshots)
        log_loss = compute_log_loss(prediction_snapshots)
        confident_accuracy = confident_coverage = confidence_threshold = None

    threshold = (
        confidence_threshold
        if confidence_threshold is not None
        else settings.model_confidence_threshold
    )

    return AnalyticsOut(
        accuracy=accuracy,
        log_loss=log_loss,
        roi=compute_roi(settled_snapshots),
        total_value_bets=total_value_bets,
        settled_value_bets=len(settled_snapshots),
        roi_trend=[
            RoiTrendPointOut(date=point.date, roi=point.roi) for point in roi_trend
        ],
        confident_accuracy=confident_accuracy,
        confident_coverage=confident_coverage,
        confidence_threshold=confidence_threshold,
        total_predictions=len(latest_predictions),
        avg_confidence=compute_avg_confidence(latest_predictions),
        high_confidence_count=count_high_confidence_predictions(
            latest_predictions,
            threshold,
        ),
        confidence_trend=confidence_trend,
        risk_distribution=RiskDistributionOut(
            low=risk_counts.low,
            medium=risk_counts.medium,
            high=risk_counts.high,
        ),
        prediction_outcomes=PredictionOutcomesOut(
            home_win=outcome_counts.home_win,
            draw=outcome_counts.draw,
            away_win=outcome_counts.away_win,
            over_25=outcome_counts.over_25,
            both_teams_score=outcome_counts.both_teams_score,
        ),
        predictions_today=predictions_today,
        markets_covered=3,
    )
