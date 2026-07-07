from __future__ import annotations

from datetime import datetime
from typing import Optional

from sqlalchemy import DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Match(Base):
    __tablename__ = "matches"

    id: Mapped[int] = mapped_column(primary_key=True)
    external_id: Mapped[Optional[int]] = mapped_column(Integer, unique=True, index=True)

    competition_id: Mapped[Optional[int]] = mapped_column(ForeignKey("competitions.id"))
    home_team_id: Mapped[int] = mapped_column(ForeignKey("teams.id"))
    away_team_id: Mapped[int] = mapped_column(ForeignKey("teams.id"))

    kickoff: Mapped[Optional[datetime]] = mapped_column(DateTime, index=True)
    status: Mapped[str] = mapped_column(String(20), default="scheduled")

    # Final score (filled in after the match, for evaluation/ROI).
    home_goals: Mapped[Optional[int]] = mapped_column(Integer)
    away_goals: Mapped[Optional[int]] = mapped_column(Integer)

    competition: Mapped[Optional["Competition"]] = relationship(
        back_populates="matches"
    )
    home_team: Mapped["Team"] = relationship(foreign_keys=[home_team_id])
    away_team: Mapped["Team"] = relationship(foreign_keys=[away_team_id])

    odds: Mapped[list["Odds"]] = relationship(
        back_populates="match", cascade="all, delete-orphan"
    )
    market_odds: Mapped[list["MarketOdds"]] = relationship(
        back_populates="match", cascade="all, delete-orphan"
    )
    predictions: Mapped[list["Prediction"]] = relationship(
        back_populates="match", cascade="all, delete-orphan"
    )
    market_predictions: Mapped[list["MarketPrediction"]] = relationship(
        back_populates="match", cascade="all, delete-orphan"
    )
    value_bets: Mapped[list["ValueBet"]] = relationship(
        back_populates="match", cascade="all, delete-orphan"
    )
