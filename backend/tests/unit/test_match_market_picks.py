"""Unit tests: market-pick enrichment is resilient to malformed stored rows."""

from __future__ import annotations

from datetime import datetime
from types import SimpleNamespace

import pytest

from app.models import MarketOdds, MarketPrediction
from app.services.match_enrichment import (
    best_market_odd,
    build_market_picks,
    latest_market_predictions,
)

pytestmark = pytest.mark.unit


def _row(
    market: str,
    probabilities: object,
    *,
    row_id: int,
    created_at: datetime,
) -> MarketPrediction:
    row = MarketPrediction(
        match_id=1,
        market=market,
        model_version="test",
        probabilities=probabilities,
    )
    row.id = row_id
    row.created_at = created_at
    return row


def _market_odd(market: str, outcome: str, odd: float, *, bookmaker: str) -> MarketOdds:
    return MarketOdds(
        match_id=1,
        bookmaker=bookmaker,
        market=market,
        outcome=outcome,
        odd=odd,
    )


def _match(
    rows: list[MarketPrediction],
    market_odds: list[MarketOdds] | None = None,
) -> SimpleNamespace:
    return SimpleNamespace(market_predictions=rows, market_odds=market_odds or [])


def test_latest_market_predictions_drops_unknown_and_malformed_rows() -> None:
    base = datetime(2026, 7, 4, 20, 0)
    good_btts = _row("btts", {"yes": 0.6, "no": 0.4}, row_id=1, created_at=base)
    good_ou = _row(
        "over_under_25", {"over": 0.55, "under": 0.45}, row_id=2, created_at=base
    )
    retired_market = _row("double_chance", {"1x": 0.7}, row_id=3, created_at=base)
    null_probs = _row("over_under_25", None, row_id=4, created_at=base)

    result = latest_market_predictions(
        _match([good_btts, good_ou, retired_market, null_probs])
    )

    assert {row.market for row in result} == {"btts", "over_under_25"}


def test_latest_market_predictions_prefers_latest_renderable_row() -> None:
    older = datetime(2026, 7, 4, 20, 0)
    newer = datetime(2026, 7, 4, 21, 0)
    good_btts = _row("btts", {"yes": 0.6, "no": 0.4}, row_id=1, created_at=older)
    # A newer btts row with a broken probabilities blob must not shadow the good one.
    broken_btts = _row("btts", None, row_id=2, created_at=newer)

    result = latest_market_predictions(_match([good_btts, broken_btts]))

    assert [row.id for row in result] == [1]


def test_build_market_picks_skips_bad_rows_without_crashing() -> None:
    base = datetime(2026, 7, 4, 20, 0)
    good = _row("btts", {"yes": 0.6, "no": 0.4}, row_id=1, created_at=base)
    retired_market = _row("double_chance", {"1x": 0.7}, row_id=2, created_at=base)

    picks = build_market_picks(_match([good, retired_market]))

    assert [pick.market for pick in picks] == ["btts"]
    assert picks[0].recommended_outcome == "yes"
    # No stored odds for this market -> price is None, not an error.
    assert picks[0].odds is None


def test_best_market_odd_picks_highest_price_for_the_outcome() -> None:
    match = _match(
        [],
        market_odds=[
            _market_odd("btts", "yes", 1.75, bookmaker="Bet365"),
            _market_odd("btts", "yes", 1.83, bookmaker="Pinnacle"),
            _market_odd("btts", "no", 2.00, bookmaker="Bet365"),
        ],
    )

    assert best_market_odd(match, "btts", "yes") == 1.83
    assert best_market_odd(match, "over_under_25", "over") is None


def test_build_market_picks_attaches_best_price_for_recommended_outcome() -> None:
    base = datetime(2026, 7, 4, 20, 0)
    btts = _row("btts", {"yes": 0.62, "no": 0.38}, row_id=1, created_at=base)
    match = _match(
        [btts],
        market_odds=[
            _market_odd("btts", "yes", 1.75, bookmaker="Bet365"),
            _market_odd("btts", "yes", 1.90, bookmaker="Pinnacle"),
            # "no" is not the recommended outcome, so its price is ignored.
            _market_odd("btts", "no", 2.10, bookmaker="Bet365"),
        ],
    )

    picks = build_market_picks(_match([btts], match.market_odds))

    assert picks[0].recommended_outcome == "yes"
    assert picks[0].odds == 1.90
