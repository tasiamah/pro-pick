from __future__ import annotations

from collections.abc import Mapping
from dataclasses import dataclass

from app.core.config import settings


@dataclass
class ValueBetResult:
    outcome: str
    model_prob: float
    odd: float
    expected_value: float
    edge: float
    recommended_stake: float
    confidence: float
    is_value: bool


def expected_value(prob: float, odd: float) -> float:
    """EV per unit staked: prob * odd - 1."""
    return prob * odd - 1.0


def implied_probability(odd: float) -> float:
    """Implied probability of a bookmaker odd (without margin correction)."""
    return 1.0 / odd if odd > 0 else 0.0


def full_kelly_fraction(prob: float, odd: float) -> float:
    """Full Kelly stake fraction for a decimal odd; bounded to [0, 1]."""
    b = odd - 1.0
    if b <= 0:
        return 0.0
    q = 1.0 - prob
    f = (b * prob - q) / b
    return max(0.0, min(1.0, f))


def recommended_stake(prob: float, odd: float, kelly_multiplier: float) -> float:
    """Fractional-Kelly stake scaled by the multiplier, clamped to [0, 1].

    Clamping keeps an out-of-range multiplier from persisting an invalid
    bankroll fraction.
    """
    stake = full_kelly_fraction(prob, odd) * kelly_multiplier
    return max(0.0, min(1.0, stake))


def confidence_score(probs: Mapping[str, float], outcome: str) -> float:
    """Reliability indicator based on model certainty.

    The margin between the chosen outcome's probability and the next most likely
    outcome, clamped to [0, 1]. A wider margin means the model is more certain
    about this pick; an outcome the model does not favor scores near zero.
    """
    chosen = probs.get(outcome, 0.0)
    rivals = [prob for key, prob in probs.items() if key != outcome]
    second_best = max(rivals) if rivals else 0.0
    return max(0.0, min(1.0, chosen - second_best))


def evaluate_outcome(
    outcome: str,
    model_prob: float,
    odd: float,
    edge_threshold: float | None = None,
    kelly_multiplier: float | None = None,
    probs: Mapping[str, float] | None = None,
) -> ValueBetResult:
    """Compute EV, edge, recommended stake (fractional Kelly) and value status."""
    threshold = (
        settings.value_bet_edge_threshold if edge_threshold is None else edge_threshold
    )
    k_mult = settings.kelly_fraction if kelly_multiplier is None else kelly_multiplier

    ev = expected_value(model_prob, odd)
    edge = model_prob - implied_probability(odd)
    stake = round(recommended_stake(model_prob, odd, k_mult), 4)
    confidence = confidence_score(probs, outcome) if probs is not None else model_prob

    return ValueBetResult(
        outcome=outcome,
        model_prob=round(model_prob, 4),
        odd=odd,
        expected_value=round(ev, 4),
        edge=round(edge, 4),
        recommended_stake=stake,
        confidence=round(confidence, 4),
        is_value=edge >= threshold,
    )


def evaluate_match(
    probs: dict[str, float], odds: dict[str, float]
) -> list[ValueBetResult]:
    """Evaluate all 1X2 outcomes; return only the actual value bets."""
    results = []
    for outcome in ("home", "draw", "away"):
        if outcome in probs and outcome in odds and odds[outcome] > 0:
            result = evaluate_outcome(
                outcome, probs[outcome], odds[outcome], probs=probs
            )
            if result.is_value:
                results.append(result)
    return results
