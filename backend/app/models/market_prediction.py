from __future__ import annotations

from datetime import datetime
from typing import Any

from sqlalchemy import JSON, DateTime, ForeignKey, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class MarketPrediction(Base):
    """Calibrated probabilities for a secondary betting market on a match."""

    __tablename__ = "market_predictions"

    id: Mapped[int] = mapped_column(primary_key=True)
    match_id: Mapped[int] = mapped_column(ForeignKey("matches.id"), index=True)
    market: Mapped[str] = mapped_column(String(32), index=True)
    model_version: Mapped[str] = mapped_column(String(40), default="fallback")

    probabilities: Mapped[dict[str, Any]] = mapped_column(JSON)

    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    match: Mapped["Match"] = relationship(back_populates="market_predictions")
