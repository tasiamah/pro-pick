from __future__ import annotations

from datetime import datetime, timedelta

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models import Match, ValueBet
from app.schemas.common import DashboardOut, ValueBetOut

router = APIRouter()


@router.get("", response_model=DashboardOut)
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

    top_bets = (
        db.execute(select(ValueBet).order_by(ValueBet.edge.desc()).limit(5))
        .scalars()
        .all()
    )

    return DashboardOut(
        matches_today=matches_today,
        upcoming_matches=upcoming,
        latest_kickoff=latest_kickoff,
        top_value_bets=[ValueBetOut.model_validate(v) for v in top_bets],
        model_accuracy=None,
        roi=None,
    )
