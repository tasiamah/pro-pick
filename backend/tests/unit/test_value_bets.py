import pytest

from app.services.value_bets import (
    evaluate_outcome,
    expected_value,
    implied_probability,
    kelly_fraction,
)

pytestmark = pytest.mark.unit


def test_expected_value_matches_example():
    # Example from the project guide: P=0.55, odd=2.10 -> EV = +0.155
    assert round(expected_value(0.55, 2.10), 3) == 0.155


def test_implied_probability():
    assert round(implied_probability(2.0), 3) == 0.5


def test_kelly_fraction_positive_edge():
    # Positive edge -> positive, bounded stake fraction.
    f = kelly_fraction(0.55, 2.10)
    assert 0.0 < f <= 1.0


def test_kelly_fraction_no_edge_is_zero():
    assert kelly_fraction(0.40, 2.10) == 0.0


def test_evaluate_outcome_flags_value():
    result = evaluate_outcome("home", 0.55, 2.10, edge_threshold=0.05)
    assert result.is_value is True
    assert result.expected_value > 0
    assert result.edge > 0


def test_evaluate_outcome_rejects_non_value():
    result = evaluate_outcome("home", 0.45, 2.0, edge_threshold=0.05)
    assert result.is_value is False
