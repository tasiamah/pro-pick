from __future__ import annotations

from collections import defaultdict
from dataclasses import dataclass
from datetime import date, datetime


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


def _actual_outcome(home_goals: int, away_goals: int) -> str:
    if home_goals > away_goals:
        return "home"
    if home_goals < away_goals:
        return "away"
    return "draw"


def _predicted_outcome(prob_home: float, prob_draw: float, prob_away: float) -> str:
    outcomes = {
        "home": prob_home,
        "draw": prob_draw,
        "away": prob_away,
    }
    return max(outcomes, key=outcomes.get)
