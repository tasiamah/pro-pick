from __future__ import annotations

from datetime import datetime
from typing import Optional

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class ValueBet(Base):
    """An identified value bet based on model probability vs. bookmaker odd."""

    __tablename__ = "value_bets"

    id: Mapped[int] = mapped_column(primary_key=True)
    match_id: Mapped[int] = mapped_column(ForeignKey("matches.id"), index=True)

    # Outcome the value bet refers to: "home" | "draw" | "away".
    outcome: Mapped[str] = mapped_column(String(10))

    model_prob: Mapped[float] = mapped_column(Float)
    odd: Mapped[float] = mapped_column(Float)
    expected_value: Mapped[float] = mapped_column(Float)
    edge: Mapped[float] = mapped_column(Float)
    recommended_stake: Mapped[float] = mapped_column(Float, default=0.0)
    confidence: Mapped[float] = mapped_column(Float, default=0.0)

    # ROI tracking: filled in after the result is known.
    settled: Mapped[bool] = mapped_column(Boolean, default=False)
    profit: Mapped[Optional[float]] = mapped_column(Float)

    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    match: Mapped["Match"] = relationship(back_populates="value_bets")
