import pytest

from app.services.value_bets import (
    evaluate_match,
    evaluate_outcome,
    expected_value,
    full_kelly_fraction,
    implied_probability,
    recommended_stake,
)

pytestmark = pytest.mark.unit


def test_expected_value_matches_example():
    # Example from the project guide: P=0.55, odd=2.10 -> EV = +0.155
    assert round(expected_value(0.55, 2.10), 3) == 0.155


def test_implied_probability():
    assert round(implied_probability(2.0), 3) == 0.5


def test_full_kelly_fraction_positive_edge():
    f = full_kelly_fraction(0.55, 2.10)
    assert 0.0 < f <= 1.0


def test_full_kelly_fraction_no_edge_is_zero():
    assert full_kelly_fraction(0.40, 2.10) == 0.0


def test_full_kelly_fraction_is_zero_when_odd_not_above_one():
    assert full_kelly_fraction(0.99, 1.0) == 0.0


def test_recommended_stake_is_fractional_kelly():
    stake = recommended_stake(0.55, 2.10, 0.25)
    assert stake == pytest.approx(full_kelly_fraction(0.55, 2.10) * 0.25)


def test_recommended_stake_scales_with_multiplier():
    half = recommended_stake(0.55, 2.10, 0.50)
    quarter = recommended_stake(0.55, 2.10, 0.25)
    assert half == pytest.approx(quarter * 2.0)


def test_edge_is_model_prob_minus_implied_probability():
    result = evaluate_outcome("home", 0.55, 2.10)
    assert round(result.edge, 4) == round(0.55 - implied_probability(2.10), 4)


def test_evaluate_outcome_flags_value():
    result = evaluate_outcome("home", 0.55, 2.10, edge_threshold=0.05)
    assert result.is_value is True
    assert result.expected_value > 0
    assert result.edge > 0


def test_evaluate_outcome_rejects_non_value():
    result = evaluate_outcome("home", 0.45, 2.0, edge_threshold=0.05)
    assert result.is_value is False


def test_value_status_gates_on_edge_not_expected_value():
    # P=0.55, odd=1.95: EV=+0.0725 clears 5% but edge=+0.0372 does not.
    result = evaluate_outcome("home", 0.55, 1.95, edge_threshold=0.05)
    assert result.expected_value > 0.05
    assert result.edge < 0.05
    assert result.is_value is False


def test_edge_threshold_is_configurable():
    assert evaluate_outcome("home", 0.55, 2.0, edge_threshold=0.10).is_value is False
    assert evaluate_outcome("home", 0.55, 2.0, edge_threshold=0.02).is_value is True


def test_evaluate_match_returns_only_value_outcomes_per_market():
    probs = {"home": 0.55, "draw": 0.25, "away": 0.20}
    odds = {"home": 2.10, "draw": 3.40, "away": 4.50}

    results = evaluate_match(probs, odds)

    assert {result.outcome for result in results} == {"home"}
    assert all(result.is_value for result in results)
