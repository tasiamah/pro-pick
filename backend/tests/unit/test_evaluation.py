from __future__ import annotations

import math

import pytest

from app.ml.evaluation import (
    brier_score,
    evaluate_scored_outcomes,
    implied_probabilities,
    multiclass_log_loss,
)

pytestmark = pytest.mark.unit


def test_implied_probabilities_remove_margin_and_sum_to_one() -> None:
    probabilities = implied_probabilities(2.0, 3.0, 4.0)

    assert round(sum(probabilities.values()), 6) == 1.0
    assert probabilities["home"] > probabilities["draw"] > probabilities["away"]


def test_implied_probabilities_handle_non_positive_odds() -> None:
    assert implied_probabilities(0.0, 0.0, 0.0) == {
        "home": 0.0,
        "draw": 0.0,
        "away": 0.0,
    }


def test_multiclass_log_loss_rewards_confident_correct_prediction() -> None:
    confident = multiclass_log_loss({"home": 0.9, "draw": 0.05, "away": 0.05}, "home")
    unsure = multiclass_log_loss({"home": 0.4, "draw": 0.3, "away": 0.3}, "home")

    assert confident < unsure


def test_multiclass_log_loss_clamps_zero_probability() -> None:
    loss = multiclass_log_loss({"home": 0.0, "draw": 0.5, "away": 0.5}, "home")

    assert loss == -math.log(1e-15)


def test_brier_score_rewards_confident_correct_prediction() -> None:
    confident = brier_score({"home": 0.9, "draw": 0.05, "away": 0.05}, "home")
    unsure = brier_score({"home": 0.4, "draw": 0.3, "away": 0.3}, "home")

    assert confident < unsure


def test_evaluate_scored_outcomes_reports_accuracy_log_loss_and_brier() -> None:
    rows = [
        ({"home": 0.7, "draw": 0.2, "away": 0.1}, "home"),
        ({"home": 0.2, "draw": 0.2, "away": 0.6}, "home"),
    ]

    metrics = evaluate_scored_outcomes(rows)

    assert metrics.sample_size == 2
    assert metrics.accuracy == 0.5
    expected_log_loss = (-math.log(0.7) - math.log(0.2)) / 2
    assert round(metrics.log_loss, 9) == round(expected_log_loss, 9)
    first = (0.7 - 1) ** 2 + 0.2**2 + 0.1**2
    second = (0.2 - 1) ** 2 + 0.2**2 + 0.6**2
    assert round(metrics.brier, 9) == round((first + second) / 2, 9)


def test_evaluate_scored_outcomes_handles_empty_input() -> None:
    metrics = evaluate_scored_outcomes([])

    assert metrics.sample_size == 0
    assert metrics.accuracy == 0.0
    assert metrics.log_loss == 0.0
    assert metrics.brier == 0.0
    assert metrics.confident_accuracy == 0.0
    assert metrics.confident_coverage == 0.0


def test_confident_accuracy_scores_only_high_probability_picks() -> None:
    rows = [
        # Confident and correct.
        ({"home": 0.8, "draw": 0.1, "away": 0.1}, "home"),
        # Confident and wrong.
        ({"home": 0.75, "draw": 0.15, "away": 0.1}, "away"),
        # Below the threshold: excluded from the confident subset entirely.
        ({"home": 0.4, "draw": 0.35, "away": 0.25}, "draw"),
    ]

    metrics = evaluate_scored_outcomes(rows, confidence_threshold=0.7)

    assert metrics.confidence_threshold == 0.7
    # 2 of 3 rows clear the bar; 1 of those 2 is correct.
    assert metrics.confident_coverage == pytest.approx(2 / 3)
    assert metrics.confident_accuracy == pytest.approx(0.5)


def test_confident_accuracy_is_zero_when_no_pick_clears_threshold() -> None:
    rows = [({"home": 0.4, "draw": 0.35, "away": 0.25}, "home")]

    metrics = evaluate_scored_outcomes(rows, confidence_threshold=0.6)

    assert metrics.confident_coverage == 0.0
    assert metrics.confident_accuracy == 0.0
