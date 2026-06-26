import pytest

from app.services.value_bets import (
    confidence_score,
    evaluate_match,
    evaluate_outcome,
    expected_value,
    full_kelly_fraction,
    implied_probability,
    recommended_stake,
    settlement_profit,
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


def test_recommended_stake_clamps_out_of_range_multiplier():
    assert recommended_stake(0.55, 2.10, -1.0) == 0.0
    assert recommended_stake(0.99, 2.10, 100.0) == 1.0


def test_settlement_profit_pays_out_net_winnings_on_a_win():
    assert settlement_profit(True, 2.10, 10.0) == pytest.approx(11.0)


def test_settlement_profit_loses_the_stake_on_a_loss():
    assert settlement_profit(False, 2.10, 10.0) == pytest.approx(-10.0)


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


def test_evaluate_outcome_without_probs_uses_model_prob_as_confidence():
    result = evaluate_outcome("home", 0.55, 2.10)
    assert result.confidence == 0.55


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


def test_confidence_score_uses_margin_over_next_best():
    probs = {"home": 0.6, "draw": 0.25, "away": 0.15}
    assert round(confidence_score(probs, "home"), 4) == 0.35


def test_confidence_score_is_zero_for_non_favored_outcome():
    probs = {"home": 0.6, "draw": 0.25, "away": 0.15}
    assert confidence_score(probs, "away") == 0.0


def test_evaluate_match_sets_margin_based_confidence():
    probs = {"home": 0.6, "draw": 0.25, "away": 0.15}
    odds = {"home": 2.1, "draw": 3.5, "away": 6.0}

    results = evaluate_match(probs, odds)

    home_bet = next(result for result in results if result.outcome == "home")
    assert home_bet.confidence == 0.35
