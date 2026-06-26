from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict


class TeamOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    logo_url: str | None = None


class OddsOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    bookmaker: str
    home: float
    draw: float
    away: float


class PredictionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    model_version: str
    prob_home: float
    prob_draw: float
    prob_away: float


class MatchOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    kickoff: datetime | None = None
    status: str
    home_team: TeamOut
    away_team: TeamOut
    competition_name: str | None = None


class MatchDetailOut(MatchOut):
    odds: list[OddsOut] = []
    prediction: PredictionOut | None = None


class ValueBetOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    match_id: int
    outcome: str
    model_prob: float
    odd: float
    expected_value: float
    edge: float
    recommended_stake: float
    confidence: float


class RoiTrendPointOut(BaseModel):
    date: str
    roi: float


class AnalyticsOut(BaseModel):
    accuracy: float | None = None
    log_loss: float | None = None
    roi: float | None = None
    total_value_bets: int = 0
    settled_value_bets: int = 0
    roi_trend: list[RoiTrendPointOut] = []


class DashboardOut(BaseModel):
    matches_today: int = 0
    upcoming_matches: int = 0
    latest_kickoff: datetime | None = None
    top_value_bets: list[ValueBetOut] = []
    model_accuracy: float | None = None
    roi: float | None = None
