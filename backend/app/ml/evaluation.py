"""Probabilistic 1X2 metric primitives (EPIC-3 / PP-56).

Scores home/draw/away probabilities with accuracy, multiclass log loss, and
the multiclass Brier score (a calibration-sensitive metric). The bookmaker
comparison itself lives in ``app/ml/backtest.py`` so it can be evaluated
out-of-sample rather than on data the model was trained on.
"""

from __future__ import annotations

import math
from collections.abc import Mapping, Sequence
from dataclasses import dataclass
from typing import Any

from app.ml.baseline import OUTCOMES, predict_outcome_probabilities
from app.ml.features import OUTCOME_AWAY, OUTCOME_DRAW, OUTCOME_HOME

LOG_LOSS_EPSILON = 1e-15
DEFAULT_CONFIDENCE_THRESHOLD = 0.5

ScoredOutcome = tuple[Mapping[str, float], str]


@dataclass(frozen=True)
class EvaluationMetrics:
    sample_size: int
    accuracy: float
    log_loss: float
    brier: float
    # Accuracy restricted to "confident" picks (top probability >= threshold) and
    # the share of matches that clears that bar. Reported so the product can show
    # an honest, high-precision figure on the subset where the model is sure,
    # separate from the full-slate accuracy that draws cap.
    confident_accuracy: float = 0.0
    confident_coverage: float = 0.0
    confidence_threshold: float = DEFAULT_CONFIDENCE_THRESHOLD


def multiclass_log_loss(probabilities: Mapping[str, float], outcome: str) -> float:
    probability = max(probabilities.get(outcome, 0.0), 0.0)
    return -math.log(min(max(probability, LOG_LOSS_EPSILON), 1.0))


def brier_score(probabilities: Mapping[str, float], outcome: str) -> float:
    total = 0.0
    for candidate in OUTCOMES:
        probability = max(probabilities.get(candidate, 0.0), 0.0)
        indicator = 1.0 if candidate == outcome else 0.0
        total += (probability - indicator) ** 2
    return total


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


def evaluate_scored_outcomes(
    rows: Sequence[ScoredOutcome],
    *,
    confidence_threshold: float = DEFAULT_CONFIDENCE_THRESHOLD,
) -> EvaluationMetrics:
    if not rows:
        return EvaluationMetrics(
            0, 0.0, 0.0, 0.0, confidence_threshold=confidence_threshold
        )
    count = len(rows)
    hits = sum(1 for probabilities, outcome in rows if _is_hit(probabilities, outcome))
    log_loss = sum(
        multiclass_log_loss(probabilities, outcome) for probabilities, outcome in rows
    )
    brier = sum(brier_score(probabilities, outcome) for probabilities, outcome in rows)

    confident = [
        (probabilities, outcome)
        for probabilities, outcome in rows
        if _top_probability(probabilities) >= confidence_threshold
    ]
    confident_hits = sum(
        1 for probabilities, outcome in confident if _is_hit(probabilities, outcome)
    )
    confident_accuracy = confident_hits / len(confident) if confident else 0.0
    confident_coverage = len(confident) / count

    return EvaluationMetrics(
        sample_size=count,
        accuracy=hits / count,
        log_loss=log_loss / count,
        brier=brier / count,
        confident_accuracy=confident_accuracy,
        confident_coverage=confident_coverage,
        confidence_threshold=confidence_threshold,
    )


def _top_probability(probabilities: Mapping[str, float]) -> float:
    return max(probabilities.values()) if probabilities else 0.0


def evaluate_model(model: Any, dataset: Any) -> EvaluationMetrics:
    rows = [
        (predict_outcome_probabilities(model, features), label)
        for features, label in zip(dataset.features, dataset.labels, strict=True)
    ]
    return evaluate_scored_outcomes(rows)


def _is_hit(probabilities: Mapping[str, float], outcome: str) -> bool:
    return max(probabilities, key=lambda key: probabilities[key]) == outcome
