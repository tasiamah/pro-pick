"""Unit tests for goal-derived market labels."""

from __future__ import annotations

import pytest

from app.ml.market_labels import (
    BTTS_NO,
    BTTS_YES,
    MARKET_BTTS,
    MARKET_OVER_UNDER_25,
    OVER,
    UNDER,
    btts_label,
    market_confidence,
    over_under_25_label,
    recommended_market_outcome,
)

pytestmark = pytest.mark.unit


def test_btts_label() -> None:
    assert btts_label(1, 1) == BTTS_YES
    assert btts_label(2, 0) == BTTS_NO
    assert btts_label(0, 0) == BTTS_NO


def test_over_under_25_label() -> None:
    assert over_under_25_label(2, 1) == OVER
    assert over_under_25_label(1, 1) == UNDER
    assert over_under_25_label(0, 0) == UNDER


def test_recommended_market_outcome_and_confidence() -> None:
    probabilities = {BTTS_YES: 0.62, BTTS_NO: 0.38}
    assert recommended_market_outcome(MARKET_BTTS, probabilities) == BTTS_YES
    assert market_confidence(MARKET_BTTS, probabilities) == pytest.approx(0.62)

    ou_probs = {OVER: 0.44, UNDER: 0.56}
    assert recommended_market_outcome(MARKET_OVER_UNDER_25, ou_probs) == UNDER
