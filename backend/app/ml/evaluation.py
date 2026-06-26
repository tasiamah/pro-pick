"""Model evaluation and bookmaker benchmark (EPIC-3 / PP-56).

Scores 1X2 probabilities with accuracy and multiclass log loss, and compares
the model against the bookmaker's margin-removed implied probabilities on
finished matches that have odds. Model probabilities are rebuilt point-in-time
so the comparison does not leak future results.
"""

from __future__ import annotations

import math
from collections.abc import Mapping, Sequence
from dataclasses import dataclass
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.ml.baseline import predict_outcome_probabilities
from app.ml.features import (
    OUTCOME_AWAY,
    OUTCOME_DRAW,
    OUTCOME_HOME,
    build_features,
    match_outcome,
)
from app.models import Match

LOG_LOSS_EPSILON = 1e-15

ScoredOutcome = tuple[Mapping[str, float], str]


@dataclass(frozen=True)
class EvaluationMetrics:
    sample_size: int
    accuracy: float
    log_loss: float


@dataclass(frozen=True)
class BenchmarkResult:
    model: EvaluationMetrics
    bookmaker: EvaluationMetrics


def multiclass_log_loss(probabilities: Mapping[str, float], outcome: str) -> float:
    probability = max(probabilities.get(outcome, 0.0), 0.0)
    return -math.log(min(max(probability, LOG_LOSS_EPSILON), 1.0))


def implied_probabilities(home: float, draw: float, away: float) -> dict[str, float]:
    inverses = {
        OUTCOME_HOME: 1.0 / home if home > 0 else 0.0,
        OUTCOME_DRAW: 1.0 / draw if draw > 0 else 0.0,
        OUTCOME_AWAY: 1.0 / away if away > 0 else 0.0,
    }
    total = sum(inverses.values())
    if total <= 0:
        return dict.fromkeys(inverses, 0.0)
    return {outcome: value / total for outcome, value in inverses.items()}


def evaluate_scored_outcomes(rows: Sequence[ScoredOutcome]) -> EvaluationMetrics:
    if not rows:
        return EvaluationMetrics(0, 0.0, 0.0)
    hits = sum(1 for probabilities, outcome in rows if _is_hit(probabilities, outcome))
    loss = sum(
        multiclass_log_loss(probabilities, outcome) for probabilities, outcome in rows
    )
    count = len(rows)
    return EvaluationMetrics(count, hits / count, loss / count)


def evaluate_model(model: Any, dataset: Any) -> EvaluationMetrics:
    rows = [
        (predict_outcome_probabilities(model, features), label)
        for features, label in zip(dataset.features, dataset.labels, strict=True)
    ]
    return evaluate_scored_outcomes(rows)


def benchmark_against_bookmaker(db: Session, model: Any) -> BenchmarkResult:
    matches = (
        db.execute(
            select(Match)
            .options(selectinload(Match.odds))
            .where(
                Match.kickoff.is_not(None),
                Match.home_goals.is_not(None),
                Match.away_goals.is_not(None),
            )
        )
        .scalars()
        .all()
    )

    model_rows: list[ScoredOutcome] = []
    bookmaker_rows: list[ScoredOutcome] = []
    for match in matches:
        if not match.odds:
            continue
        outcome = match_outcome(match.home_goals, match.away_goals)
        model_rows.append(
            (predict_outcome_probabilities(model, build_features(db, match)), outcome)
        )
        odds = match.odds[0]
        bookmaker_rows.append(
            (implied_probabilities(odds.home, odds.draw, odds.away), outcome)
        )

    return BenchmarkResult(
        model=evaluate_scored_outcomes(model_rows),
        bookmaker=evaluate_scored_outcomes(bookmaker_rows),
    )


def _is_hit(probabilities: Mapping[str, float], outcome: str) -> bool:
    return max(probabilities, key=lambda key: probabilities[key]) == outcome
