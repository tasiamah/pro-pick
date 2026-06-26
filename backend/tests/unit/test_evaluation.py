from __future__ import annotations

import math

import pytest

from app.ml.evaluation import (
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


def test_evaluate_scored_outcomes_reports_accuracy_and_log_loss() -> None:
    rows = [
        ({"home": 0.7, "draw": 0.2, "away": 0.1}, "home"),
        ({"home": 0.2, "draw": 0.2, "away": 0.6}, "home"),
    ]

    metrics = evaluate_scored_outcomes(rows)

    assert metrics.sample_size == 2
    assert metrics.accuracy == 0.5
    expected = (-math.log(0.7) - math.log(0.2)) / 2
    assert round(metrics.log_loss, 9) == round(expected, 9)


def test_evaluate_scored_outcomes_handles_empty_input() -> None:
    metrics = evaluate_scored_outcomes([])

    assert metrics.sample_size == 0
    assert metrics.accuracy == 0.0
    assert metrics.log_loss == 0.0
