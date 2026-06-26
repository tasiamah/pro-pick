from __future__ import annotations

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
    """Fractional-Kelly stake: full Kelly scaled by the configured fraction."""
    return full_kelly_fraction(prob, odd) * kelly_multiplier


def evaluate_outcome(
    outcome: str,
    model_prob: float,
    odd: float,
    edge_threshold: float | None = None,
    kelly_multiplier: float | None = None,
) -> ValueBetResult:
    """Compute EV, edge, recommended stake (fractional Kelly) and value status."""
    threshold = (
        settings.value_bet_edge_threshold if edge_threshold is None else edge_threshold
    )
    k_mult = settings.kelly_fraction if kelly_multiplier is None else kelly_multiplier

    ev = expected_value(model_prob, odd)
    edge = model_prob - implied_probability(odd)
    stake = round(recommended_stake(model_prob, odd, k_mult), 4)

    return ValueBetResult(
        outcome=outcome,
        model_prob=round(model_prob, 4),
        odd=odd,
        expected_value=round(ev, 4),
        edge=round(edge, 4),
        recommended_stake=stake,
        confidence=round(model_prob, 4),
        is_value=edge >= threshold,
    )


def evaluate_match(
    probs: dict[str, float], odds: dict[str, float]
) -> list[ValueBetResult]:
    """Evaluate all 1X2 outcomes; return only the actual value bets."""
    results = []
    for outcome in ("home", "draw", "away"):
        if outcome in probs and outcome in odds and odds[outcome] > 0:
            result = evaluate_outcome(outcome, probs[outcome], odds[outcome])
            if result.is_value:
                results.append(result)
    return results
