from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models import ValueBet
from app.schemas.common import AnalyticsOut

router = APIRouter()


@router.get("", response_model=AnalyticsOut)
def get_analytics(db: Session = Depends(get_db)) -> AnalyticsOut:
    """Modelprestaties en ROI van value bets (PP: GET /analytics)."""
    value_bets = db.execute(select(ValueBet)).scalars().all()
    settled = [v for v in value_bets if v.settled and v.profit is not None]

    roi = None
    if settled:
        total_stake = sum(v.recommended_stake for v in settled) or len(settled)
        total_profit = sum(v.profit or 0.0 for v in settled)
        roi = total_profit / total_stake if total_stake else None

    return AnalyticsOut(
        accuracy=None,
        log_loss=None,
        roi=roi,
        total_value_bets=len(value_bets),
        settled_value_bets=len(settled),
        roi_trend=[],
    )
