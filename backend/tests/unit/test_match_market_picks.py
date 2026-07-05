"""Unit tests: market-pick enrichment is resilient to malformed stored rows."""

from __future__ import annotations

from datetime import datetime
from types import SimpleNamespace

import pytest

from app.models import MarketPrediction
from app.services.match_enrichment import (
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


def _match(rows: list[MarketPrediction]) -> SimpleNamespace:
    return SimpleNamespace(market_predictions=rows)


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
