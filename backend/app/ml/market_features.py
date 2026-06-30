"""Market-derived features for the 1X2 model (bookmaker implied probabilities).

The bookmaker line is the sharpest prior available for a fixture — it already
prices in injuries, suspensions, line-ups and money flow that the results-only
features cannot see. We therefore feed the **margin-removed implied
probabilities** of the best-price book into the model. Odds are set before
kickoff, so they are a leakage-free pre-match signal.

Matches without usable odds get zeroed market columns plus a ``has_market_odds``
flag, so every row has the full feature schema and the model can learn to lean on
the market only when it is actually present.

This module is intentionally self-contained (it only reads ``home``/``draw``/
``away``/``bookmaker``/``id`` attributes) to avoid import cycles with the feature
pipeline; it mirrors ``value_bets.primary_odds`` (best price = lowest overround)
and ``evaluation.implied_probabilities`` (margin removal).
"""

from __future__ import annotations

from collections.abc import Sequence
from typing import Protocol

MARKET_FEATURE_COLUMNS: list[str] = [
    "market_prob_home",
    "market_prob_draw",
    "market_prob_away",
    "market_overround",
    "has_market_odds",
]

_MISSING_MARKET_FEATURES: dict[str, float] = {
    "market_prob_home": 0.0,
    "market_prob_draw": 0.0,
    "market_prob_away": 0.0,
    "market_overround": 0.0,
    "has_market_odds": 0.0,
}


class OddsLike(Protocol):
    home: float
    draw: float
    away: float


def _has_valid_prices(odds: OddsLike) -> bool:
    return all(
        getattr(odds, attr, None) is not None and getattr(odds, attr) > 0
        for attr in ("home", "draw", "away")
    )


def _overround(odds: OddsLike) -> float:
    return 1.0 / odds.home + 1.0 / odds.draw + 1.0 / odds.away


def best_price_odds(odds_rows: Sequence[OddsLike]) -> OddsLike | None:
    """Best-price odds row: the book with the lowest overround (margin).

    Bookmaker name and id break ties so the choice is deterministic, matching
    ``value_bets.primary_odds``. Rows with a missing/non-positive price are
    ignored.
    """
    valid = [odds for odds in odds_rows if _has_valid_prices(odds)]
    if not valid:
        return None
    return min(
        valid,
        key=lambda odds: (
            _overround(odds),
            (getattr(odds, "bookmaker", "") or "").lower(),
            getattr(odds, "id", 0) or 0,
        ),
    )


def market_features(odds_rows: Sequence[OddsLike] | None) -> dict[str, float]:
    """Market feature columns for a match from its odds rows.

    Returns the margin-removed implied probabilities of the best-price book plus
    the book's overround and a ``has_market_odds`` flag. When no usable odds
    exist, returns the zeroed columns with ``has_market_odds`` = 0.
    """
    best = best_price_odds(odds_rows or [])
    if best is None:
        return dict(_MISSING_MARKET_FEATURES)

    total = _overround(best)
    return {
        "market_prob_home": (1.0 / best.home) / total,
        "market_prob_draw": (1.0 / best.draw) / total,
        "market_prob_away": (1.0 / best.away) / total,
        "market_overround": total - 1.0,
        "has_market_odds": 1.0,
    }
