from __future__ import annotations

from dataclasses import dataclass

import pytest

from app.ml.market_features import (
    MARKET_FEATURE_COLUMNS,
    best_price_odds,
    market_features,
)

pytestmark = pytest.mark.unit


@dataclass
class FakeOdds:
    home: float
    draw: float
    away: float
    bookmaker: str = "Book"
    id: int = 1


def test_market_features_are_margin_removed_and_sum_to_one() -> None:
    # Overround > 1 (juiced book); implied probs must renormalize to 1.
    features = market_features([FakeOdds(home=2.0, draw=4.0, away=4.0)])

    assert features["has_market_odds"] == 1.0
    probs = (
        features["market_prob_home"],
        features["market_prob_draw"],
        features["market_prob_away"],
    )
    assert round(sum(probs), 9) == 1.0
    # Shortest price is the most likely outcome.
    assert features["market_prob_home"] > features["market_prob_draw"]
    # Raw overround = 1/2 + 1/4 + 1/4 = 1.0 -> vig 0.0 for a fair book.
    assert features["market_overround"] == pytest.approx(0.0)


def test_market_features_report_overround_vig() -> None:
    features = market_features([FakeOdds(home=1.9, draw=3.5, away=3.9)])
    raw = 1 / 1.9 + 1 / 3.5 + 1 / 3.9
    assert features["market_overround"] == pytest.approx(raw - 1.0)


def test_missing_or_invalid_odds_yield_zeroed_columns() -> None:
    for rows in ([], None, [FakeOdds(home=0.0, draw=3.0, away=3.0)]):
        features = market_features(rows)
        assert features["has_market_odds"] == 0.0
        assert features["market_prob_home"] == 0.0
        assert features["market_prob_draw"] == 0.0
        assert features["market_prob_away"] == 0.0
        assert features["market_overround"] == 0.0
        assert set(features) == set(MARKET_FEATURE_COLUMNS)


def test_best_price_picks_lowest_overround_book() -> None:
    juiced = FakeOdds(home=1.8, draw=3.2, away=3.8, bookmaker="Juiced", id=1)
    sharp = FakeOdds(home=2.0, draw=3.5, away=4.2, bookmaker="Sharp", id=2)

    best = best_price_odds([juiced, sharp])

    assert best is sharp


def test_best_price_skips_invalid_and_returns_none_when_all_invalid() -> None:
    assert best_price_odds([FakeOdds(home=-1.0, draw=3.0, away=3.0)]) is None
