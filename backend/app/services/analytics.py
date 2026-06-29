from __future__ import annotations

import math
import time
from collections import defaultdict
from dataclasses import dataclass
from datetime import date, datetime
from threading import Lock

from sqlalchemy import and_, func, select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models import Match, Prediction, ValueBet

LOG_LOSS_EPSILON = 1e-15

_metrics_cache_lock = Lock()
_metrics_cache: _ModelMetricsCache | None = None


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


@dataclass
class _ModelMetricsCache:
    prediction_snapshots: list[PredictionSnapshot]
    settled_snapshots: list[SettledBetSnapshot]
    expires_at: float


def clear_model_metrics_cache() -> None:
    global _metrics_cache
    with _metrics_cache_lock:
        _metrics_cache = None


def get_model_metrics(
    db: Session,
) -> tuple[list[PredictionSnapshot], list[SettledBetSnapshot]]:
    """Load prediction and settled-bet snapshots with a short-lived in-process cache."""
    global _metrics_cache

    ttl = settings.cache_ttl_seconds
    if ttl <= 0:
        return load_prediction_snapshots(db), load_settled_bet_snapshots(db)

    now = time.monotonic()
    with _metrics_cache_lock:
        if _metrics_cache is not None and now < _metrics_cache.expires_at:
            return (
                _metrics_cache.prediction_snapshots,
                _metrics_cache.settled_snapshots,
            )

    prediction_snapshots = load_prediction_snapshots(db)
    settled_snapshots = load_settled_bet_snapshots(db)

    with _metrics_cache_lock:
        _metrics_cache = _ModelMetricsCache(
            prediction_snapshots=prediction_snapshots,
            settled_snapshots=settled_snapshots,
            expires_at=now + ttl,
        )

    return prediction_snapshots, settled_snapshots


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
        == actual_outcome(prediction.home_goals, prediction.away_goals)
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
        outcome = actual_outcome(prediction.home_goals, prediction.away_goals)
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
    finished_match_ids = (
        select(Match.id)
        .where(
            Match.home_goals.is_not(None),
            Match.away_goals.is_not(None),
        )
        .scalar_subquery()
    )

    latest_created_subq = (
        select(
            Prediction.match_id,
            func.max(Prediction.created_at).label("latest_created_at"),
        )
        .where(Prediction.match_id.in_(finished_match_ids))
        .group_by(Prediction.match_id)
        .subquery()
    )

    latest_prediction_subq = (
        select(
            Prediction.match_id,
            func.max(Prediction.id).label("latest_prediction_id"),
        )
        .join(
            latest_created_subq,
            and_(
                Prediction.match_id == latest_created_subq.c.match_id,
                Prediction.created_at == latest_created_subq.c.latest_created_at,
            ),
        )
        .group_by(Prediction.match_id)
        .subquery()
    )

    rows = db.execute(
        select(
            Prediction.prob_home,
            Prediction.prob_draw,
            Prediction.prob_away,
            Match.home_goals,
            Match.away_goals,
        )
        .join(Match, Prediction.match_id == Match.id)
        .join(
            latest_prediction_subq,
            Prediction.id == latest_prediction_subq.c.latest_prediction_id,
        )
        .where(
            Match.home_goals.is_not(None),
            Match.away_goals.is_not(None),
        )
    ).all()

    return [
        PredictionSnapshot(
            prob_home=row.prob_home,
            prob_draw=row.prob_draw,
            prob_away=row.prob_away,
            home_goals=row.home_goals,
            away_goals=row.away_goals,
        )
        for row in rows
        if row.home_goals is not None and row.away_goals is not None
    ]


def load_settled_bet_snapshots(db: Session) -> list[SettledBetSnapshot]:
    rows = db.execute(
        select(
            ValueBet.profit,
            ValueBet.recommended_stake,
            ValueBet.created_at,
        ).where(
            ValueBet.settled.is_(True),
            ValueBet.profit.is_not(None),
        )
    ).all()

    return [
        SettledBetSnapshot(
            profit=row.profit or 0.0,
            recommended_stake=row.recommended_stake,
            created_at=row.created_at,
        )
        for row in rows
    ]


def actual_outcome(home_goals: int, away_goals: int) -> str:
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
