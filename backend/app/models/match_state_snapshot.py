from __future__ import annotations

from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class MatchStateSnapshot(Base):
    """Tracks the last known match state for detecting notification events."""

    __tablename__ = "match_state_snapshots"

    id: Mapped[int] = mapped_column(primary_key=True)
    match_id: Mapped[int] = mapped_column(
        ForeignKey("matches.id"),
        unique=True,
        index=True,
    )
    status: Mapped[str] = mapped_column(String(20), default="scheduled")
    fixture_status_short: Mapped[str | None] = mapped_column(String(8))
    home_goals: Mapped[int | None] = mapped_column(Integer)
    away_goals: Mapped[int | None] = mapped_column(Integer)
    lineups_confirmed: Mapped[bool] = mapped_column(default=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        server_default=func.now(),
        onupdate=func.now(),
    )
