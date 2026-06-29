from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.cache import set_cache_headers
from app.core.database import get_db
from app.models import ValueBet
from app.schemas.common import AnalyticsOut, RoiTrendPointOut
from app.services.analytics import (
    active_model_metrics,
    build_roi_trend,
    compute_accuracy,
    compute_log_loss,
    compute_roi,
    get_model_metrics,
)

router = APIRouter()


@router.get("", response_model=AnalyticsOut, dependencies=[Depends(set_cache_headers)])
def get_analytics(db: Session = Depends(get_db)) -> AnalyticsOut:
    """Model performance and ROI of value bets (PP: GET /analytics)."""
    total_value_bets = db.execute(select(func.count(ValueBet.id))).scalar_one()
    prediction_snapshots, settled_snapshots = get_model_metrics(db)
    roi_trend = build_roi_trend(settled_snapshots)

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
    )
