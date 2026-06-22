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
    """EV per ingezette eenheid: kans * odd - 1."""
    return prob * odd - 1.0


def implied_probability(odd: float) -> float:
    """Impliciete kans van een bookmaker-odd (zonder marge-correctie)."""
    return 1.0 / odd if odd > 0 else 0.0


def kelly_fraction(prob: float, odd: float) -> float:
    """Volledige Kelly-fractie; begrensd op [0, 1]."""
    b = odd - 1.0
    if b <= 0:
        return 0.0
    q = 1.0 - prob
    f = (b * prob - q) / b
    return max(0.0, min(1.0, f))


def evaluate_outcome(
    outcome: str,
    model_prob: float,
    odd: float,
    edge_threshold: float | None = None,
    kelly_multiplier: float | None = None,
) -> ValueBetResult:
    """Bereken EV, edge, aanbevolen inzet (fractionele Kelly) en value-status."""
    threshold = (
        settings.value_bet_edge_threshold if edge_threshold is None else edge_threshold
    )
    k_mult = settings.kelly_fraction if kelly_multiplier is None else kelly_multiplier

    ev = expected_value(model_prob, odd)
    edge = model_prob - implied_probability(odd)
    stake = round(kelly_fraction(model_prob, odd) * k_mult, 4)

    return ValueBetResult(
        outcome=outcome,
        model_prob=round(model_prob, 4),
        odd=odd,
        expected_value=round(ev, 4),
        edge=round(edge, 4),
        recommended_stake=stake,
        confidence=round(model_prob, 4),
        is_value=ev >= threshold,
    )


def evaluate_match(
    probs: dict[str, float], odds: dict[str, float]
) -> list[ValueBetResult]:
    """Evalueer alle 1X2-uitkomsten; geef alleen de echte value bets terug."""
    results = []
    for outcome in ("home", "draw", "away"):
        if outcome in probs and outcome in odds and odds[outcome] > 0:
            result = evaluate_outcome(outcome, probs[outcome], odds[outcome])
            if result.is_value:
                results.append(result)
    return results
