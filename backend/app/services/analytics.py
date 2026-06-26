from __future__ import annotations

import math
from collections import defaultdict
from dataclasses import dataclass
from datetime import date, datetime

from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.models import Match, Prediction, ValueBet

LOG_LOSS_EPSILON = 1e-15


@dataclass(frozen=True)
class RoiTrendPoint:
    date: str
    roi: float


@dataclass(frozen=True)
class SettledBetSnapshot:
    profit: float
    recommended_stake: float
    created_at: datetime


@dataclass(frozen=True)
class PredictionSnapshot:
    prob_home: float
    prob_draw: float
    prob_away: float
    home_goals: int
    away_goals: int


def compute_roi(settled_bets: list[SettledBetSnapshot]) -> float | None:
    if not settled_bets:
        return None

    total_stake = sum(
        bet.recommended_stake if bet.recommended_stake > 0 else 1.0
        for bet in settled_bets
    )
    total_profit = sum(bet.profit for bet in settled_bets)
    if total_stake <= 0:
        return None

    return total_profit / total_stake


def compute_accuracy(predictions: list[PredictionSnapshot]) -> float | None:
    if not predictions:
        return None

    correct = sum(
        1
        for prediction in predictions
        if _predicted_outcome(
            prediction.prob_home,
            prediction.prob_draw,
            prediction.prob_away,
        )
        == _actual_outcome(prediction.home_goals, prediction.away_goals)
    )
    return correct / len(predictions)


def compute_log_loss(predictions: list[PredictionSnapshot]) -> float | None:
    if not predictions:
        return None

    total = 0.0
    for prediction in predictions:
        probabilities = {
            "home": prediction.prob_home,
            "draw": prediction.prob_draw,
            "away": prediction.prob_away,
        }
        outcome = _actual_outcome(prediction.home_goals, prediction.away_goals)
        total += -math.log(_actual_probability(probabilities, outcome))
    return total / len(predictions)


def build_roi_trend(settled_bets: list[SettledBetSnapshot]) -> list[RoiTrendPoint]:
    if not settled_bets:
        return []

    daily_totals: dict[date, tuple[float, float]] = defaultdict(lambda: (0.0, 0.0))
    for bet in settled_bets:
        day = bet.created_at.date()
        profit, stake = daily_totals[day]
        daily_totals[day] = (
            profit + bet.profit,
            stake + (bet.recommended_stake if bet.recommended_stake > 0 else 1.0),
        )

    cumulative_profit = 0.0
    cumulative_stake = 0.0
    points: list[RoiTrendPoint] = []
    for day in sorted(daily_totals):
        day_profit, day_stake = daily_totals[day]
        cumulative_profit += day_profit
        cumulative_stake += day_stake
        roi = cumulative_profit / cumulative_stake if cumulative_stake else 0.0
        points.append(RoiTrendPoint(date=day.isoformat(), roi=roi))

    return points


def load_prediction_snapshots(db: Session) -> list[PredictionSnapshot]:
    finished_matches = (
        db.execute(
            select(Match)
            .options(joinedload(Match.predictions))
            .where(
                Match.home_goals.is_not(None),
                Match.away_goals.is_not(None),
            )
        )
        .unique()
        .scalars()
        .all()
    )

    snapshots: list[PredictionSnapshot] = []
    for match in finished_matches:
        latest_prediction = _latest_prediction(match)
        if latest_prediction is None:
            continue
        snapshots.append(
            PredictionSnapshot(
                prob_home=latest_prediction.prob_home,
                prob_draw=latest_prediction.prob_draw,
                prob_away=latest_prediction.prob_away,
                home_goals=match.home_goals,
                away_goals=match.away_goals,
            )
        )
    return snapshots


def load_settled_bet_snapshots(db: Session) -> list[SettledBetSnapshot]:
    settled_bets = (
        db.execute(select(ValueBet).where(ValueBet.settled.is_(True))).scalars().all()
    )
    return [
        SettledBetSnapshot(
            profit=value_bet.profit or 0.0,
            recommended_stake=value_bet.recommended_stake,
            created_at=value_bet.created_at,
        )
        for value_bet in settled_bets
        if value_bet.profit is not None
    ]


def _latest_prediction(match: Match) -> Prediction | None:
    if not match.predictions:
        return None
    return max(match.predictions, key=lambda prediction: prediction.created_at)


def _actual_outcome(home_goals: int, away_goals: int) -> str:
    if home_goals > away_goals:
        return "home"
    if home_goals < away_goals:
        return "away"
    return "draw"


def _actual_probability(probabilities: dict[str, float], outcome: str) -> float:
    total = sum(max(value, 0.0) for value in probabilities.values())
    probability = max(probabilities[outcome], 0.0) / total if total > 0 else 0.0
    return min(max(probability, LOG_LOSS_EPSILON), 1.0)


def _predicted_outcome(prob_home: float, prob_draw: float, prob_away: float) -> str:
    outcomes = {
        "home": prob_home,
        "draw": prob_draw,
        "away": prob_away,
    }
    return max(outcomes, key=outcomes.get)
