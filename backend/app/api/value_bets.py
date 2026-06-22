from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models import ValueBet
from app.schemas.common import ValueBetOut

router = APIRouter()


@router.get("", response_model=list[ValueBetOut])
def list_value_bets(
    db: Session = Depends(get_db),
    limit: int = Query(50, ge=1, le=200),
) -> list[ValueBetOut]:
    """Value bets, gesorteerd op edge (PP: GET /value-bets)."""
    stmt = select(ValueBet).order_by(ValueBet.edge.desc()).limit(limit)
    value_bets = db.execute(stmt).scalars().all()
    return [ValueBetOut.model_validate(v) for v in value_bets]
