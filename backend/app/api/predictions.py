from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.core.database import get_db
from app.models import Match, Prediction
from app.schemas.common import PredictionOut
from app.services.match_enrichment import to_prediction_out

router = APIRouter()


@router.get("", response_model=list[PredictionOut])
def list_predictions(
    db: Session = Depends(get_db),
    limit: int = Query(50, ge=1, le=200),
    match_id: int | None = Query(None, ge=1),
) -> list[PredictionOut]:
    """Predictions (model probabilities) per match (PP: GET /predictions)."""
    stmt = (
        select(Prediction)
        .options(
            selectinload(Prediction.match).selectinload(Match.market_predictions),
            selectinload(Prediction.match).selectinload(Match.predictions),
        )
        .order_by(Prediction.created_at.desc())
    )
    if match_id is not None:
        stmt = stmt.where(Prediction.match_id == match_id)
    stmt = stmt.limit(limit)
    predictions = db.execute(stmt).scalars().all()
    return [
        to_prediction_out(db, prediction.match, prediction)
        for prediction in predictions
        if prediction.match is not None
    ]
