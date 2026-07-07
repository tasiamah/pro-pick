from __future__ import annotations

from datetime import datetime

from sqlalchemy import DateTime, Float, ForeignKey, String, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class MarketOdds(Base):
    """Bookmaker odds for a secondary market outcome (BTTS, Over/Under 2.5).

    One row per (match, bookmaker, market, outcome) — e.g. BTTS "yes" at 1.80.
    Stored separately from the 1X2 ``Odds`` row because those markets have their
    own outcome space, and lets us price BTTS/Over-Under picks the same way we
    price the 1X2 pick.
    """

    __tablename__ = "market_odds"
    __table_args__ = (
        UniqueConstraint(
            "match_id",
            "bookmaker",
            "market",
            "outcome",
            name="uq_market_odds_match_bookmaker_market_outcome",
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    match_id: Mapped[int] = mapped_column(ForeignKey("matches.id"), index=True)
    bookmaker: Mapped[str] = mapped_column(String(80), default="average")
    market: Mapped[str] = mapped_column(String(32), index=True)
    outcome: Mapped[str] = mapped_column(String(16))
    odd: Mapped[float] = mapped_column(Float)

    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    match: Mapped["Match"] = relationship(back_populates="market_odds")
