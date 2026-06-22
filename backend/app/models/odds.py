from __future__ import annotations

from sqlalchemy import Float, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Odds(Base):
    """Bookmaker odds for the 1X2 market per match."""

    __tablename__ = "odds"

    id: Mapped[int] = mapped_column(primary_key=True)
    match_id: Mapped[int] = mapped_column(ForeignKey("matches.id"), index=True)
    bookmaker: Mapped[str] = mapped_column(String(80), default="average")

    home: Mapped[float] = mapped_column(Float)
    draw: Mapped[float] = mapped_column(Float)
    away: Mapped[float] = mapped_column(Float)

    match: Mapped["Match"] = relationship(back_populates="odds")
