from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict


class HealthOut(BaseModel):
    status: str
    app: str
    env: str


class ServiceInfoOut(BaseModel):
    app: str
    docs: str
    health: str


class TeamOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    logo_url: str | None = None
    form: list[str] | None = None


class OddsOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    bookmaker: str
    home: float
    draw: float
    away: float
    previous_home: float | None = None
    previous_draw: float | None = None
    previous_away: float | None = None
    home_movement: str | None = None
    draw_movement: str | None = None
    away_movement: str | None = None


class MarketPickOut(BaseModel):
    market: str
    model_version: str
    probabilities: dict[str, float]
    recommended_outcome: str
    confidence: float


class PredictionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    match_id: int
    model_version: str
    prob_home: float
    prob_draw: float
    prob_away: float
    confidence: float | None = None
    recommended_outcome: str | None = None
    insights: list[str] = []
    markets: list[MarketPickOut] = []


class MatchOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    kickoff: datetime | None = None
    status: str
    home_team: TeamOut
    away_team: TeamOut
    competition_name: str | None = None
    home_goals: int | None = None
    away_goals: int | None = None


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


class RiskDistributionOut(BaseModel):
    low: int = 0
    medium: int = 0
    high: int = 0


class PredictionOutcomesOut(BaseModel):
    home_win: int = 0
    draw: int = 0
    away_win: int = 0


class AnalyticsOut(BaseModel):
    accuracy: float | None = None
    log_loss: float | None = None
    roi: float | None = None
    total_value_bets: int = 0
    settled_value_bets: int = 0
    roi_trend: list[RoiTrendPointOut] = []
    confident_accuracy: float | None = None
    confident_coverage: float | None = None
    confidence_threshold: float | None = None
    total_predictions: int = 0
    avg_confidence: float | None = None
    high_confidence_count: int = 0
    confidence_trend: list[int] = []
    risk_distribution: RiskDistributionOut = RiskDistributionOut()
    prediction_outcomes: PredictionOutcomesOut = PredictionOutcomesOut()
    predictions_today: int = 0


class DashboardOut(BaseModel):
    matches_today: int = 0
    upcoming_matches: int = 0
    upcoming_value_bets: int = 0
    latest_kickoff: datetime | None = None
    next_prediction_kickoff: datetime | None = None
    top_value_bets: list[ValueBetOut] = []
    model_accuracy: float | None = None
    roi: float | None = None
    confident_accuracy: float | None = None
    confident_coverage: float | None = None
    confidence_threshold: float | None = None
