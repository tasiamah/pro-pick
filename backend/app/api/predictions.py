from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models import Prediction
from app.schemas.common import PredictionOut

router = APIRouter()


@router.get("", response_model=list[PredictionOut])
def list_predictions(
    db: Session = Depends(get_db),
    limit: int = Query(50, ge=1, le=200),
    match_id: int | None = Query(None, ge=1),
) -> list[PredictionOut]:
    """Predictions (model probabilities) per match (PP: GET /predictions)."""
    stmt = select(Prediction).order_by(Prediction.created_at.desc())
    if match_id is not None:
        stmt = stmt.where(Prediction.match_id == match_id)
    stmt = stmt.limit(limit)
    predictions = db.execute(stmt).scalars().all()
    return [PredictionOut.model_validate(p) for p in predictions]
