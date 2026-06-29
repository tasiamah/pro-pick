from __future__ import annotations

from collections.abc import Mapping
from dataclasses import dataclass

from sqlalchemy import delete
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models import Match, Odds, ValueBet


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


def settlement_profit(won: bool, odd: float, stake: float) -> float:
    """Realized profit for a settled bet: stake * (odd - 1) on a win, else -stake."""
    return stake * (odd - 1.0) if won else -stake


def confidence_score(probs: Mapping[str, float], outcome: str) -> float:
    """Reliability indicator based on model certainty.

    The margin between the chosen outcome's probability and the next most likely
    outcome, clamped to [0, 1]. A wider margin means the model is more certain
    about this pick; an outcome the model does not favor scores near zero. When
    no rival outcomes are supplied, the margin is the chosen probability itself.
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
    max_odds: float | None = None,
    min_confidence: float | None = None,
) -> ValueBetResult:
    """Compute EV, edge, recommended stake (fractional Kelly) and value status.

    Beyond a positive edge, a bet must clear the quality guard to be flagged:
    its odd may not exceed ``max_odds`` and its confidence must reach
    ``min_confidence``. This keeps unreliable longshots and near-coin-flip picks
    out of the surfaced recommendations.
    """
    threshold = (
        settings.value_bet_edge_threshold if edge_threshold is None else edge_threshold
    )
    k_mult = settings.kelly_fraction if kelly_multiplier is None else kelly_multiplier
    odd_cap = settings.value_bet_max_odds if max_odds is None else max_odds
    min_conf = (
        settings.value_bet_min_confidence if min_confidence is None else min_confidence
    )

    ev = expected_value(model_prob, odd)
    edge = model_prob - implied_probability(odd)
    stake = round(recommended_stake(model_prob, odd, k_mult), 4)
    distribution = probs if probs is not None else {outcome: model_prob}
    confidence = confidence_score(distribution, outcome)

    is_value = edge >= threshold and odd <= odd_cap and confidence >= min_conf

    return ValueBetResult(
        outcome=outcome,
        model_prob=round(model_prob, 4),
        odd=odd,
        expected_value=round(ev, 4),
        edge=round(edge, 4),
        recommended_stake=stake,
        confidence=round(confidence, 4),
        is_value=is_value,
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


def primary_odds(odds_rows: list[Odds]) -> Odds | None:
    """Deterministically pick one odds row per match (by bookmaker, then id)."""
    if not odds_rows:
        return None
    return sorted(odds_rows, key=lambda item: (item.bookmaker.lower(), item.id))[0]


def generate_value_bets(db: Session, match: Match) -> list[ValueBet]:
    """Persist value bets (EV, edge, stake, confidence) for a match.

    Uses the latest prediction and the primary odds, replacing any unsettled
    bets for the match. Requires ``match.predictions`` and ``match.odds`` to be
    loaded; returns the persisted rows.
    """
    if not match.predictions or not match.odds:
        return []

    odds = primary_odds(match.odds)
    if odds is None:
        return []

    prediction = max(match.predictions, key=lambda item: (item.created_at, item.id))
    probabilities = {
        "home": prediction.prob_home,
        "draw": prediction.prob_draw,
        "away": prediction.prob_away,
    }
    odds_values = {"home": odds.home, "draw": odds.draw, "away": odds.away}

    db.execute(
        delete(ValueBet).where(
            ValueBet.match_id == match.id,
            ValueBet.settled.is_(False),
        )
    )

    created = [
        ValueBet(
            match_id=match.id,
            outcome=result.outcome,
            model_prob=result.model_prob,
            odd=result.odd,
            expected_value=result.expected_value,
            edge=result.edge,
            recommended_stake=result.recommended_stake,
            confidence=result.confidence,
        )
        for result in evaluate_match(probabilities, odds_values)
    ]
    db.add_all(created)
    db.flush()
    return created
