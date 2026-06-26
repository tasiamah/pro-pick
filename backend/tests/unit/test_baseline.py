from __future__ import annotations

import pytest

from app.ml.baseline import (
    feature_vector,
    predict_outcome_probabilities,
    train_baseline_model,
)
from app.ml.features import FEATURE_COLUMNS, TrainingDataset

pytestmark = pytest.mark.unit


def _features(**overrides: float) -> dict[str, float]:
    base = {column: 0.0 for column in FEATURE_COLUMNS}
    base.update(overrides)
    return base


def _separable_dataset() -> TrainingDataset:
    features = []
    labels = []
    for index in range(4):
        nudge = index * 0.1
        features.append(
            _features(
                home_form_points=3.0 - nudge,
                table_points_diff=9.0 - nudge,
            )
        )
        labels.append("home")
        features.append(
            _features(
                away_form_points=3.0 - nudge,
                table_points_diff=-9.0 + nudge,
            )
        )
        labels.append("away")
        features.append(
            _features(
                home_form_points=1.0,
                away_form_points=1.0,
                table_points_diff=nudge,
            )
        )
        labels.append("draw")

    return TrainingDataset(
        match_ids=list(range(len(features))),
        features=features,
        labels=labels,
    )


def test_feature_vector_orders_by_columns() -> None:
    vector = feature_vector(_features(home_form_points=2.0, away_rest_days=5.0))

    assert len(vector) == len(FEATURE_COLUMNS)
    assert vector[FEATURE_COLUMNS.index("home_form_points")] == 2.0
    assert vector[FEATURE_COLUMNS.index("away_rest_days")] == 5.0


def test_train_baseline_model_requires_data() -> None:
    with pytest.raises(ValueError):
        train_baseline_model(TrainingDataset(match_ids=[], features=[], labels=[]))


def test_probabilities_cover_outcomes_and_sum_to_one() -> None:
    model = train_baseline_model(_separable_dataset())

    probabilities = predict_outcome_probabilities(
        model, _features(home_form_points=2.0)
    )

    assert list(probabilities.keys()) == ["home", "draw", "away"]
    assert all(0.0 <= value <= 1.0 for value in probabilities.values())
    assert round(sum(probabilities.values()), 6) == 1.0


def test_predictions_are_deterministic() -> None:
    sample = _features(home_form_points=2.5, table_points_diff=6.0)

    first = predict_outcome_probabilities(
        train_baseline_model(_separable_dataset()), sample
    )
    second = predict_outcome_probabilities(
        train_baseline_model(_separable_dataset()), sample
    )

    assert first == second


def test_model_learns_home_advantage_signal() -> None:
    model = train_baseline_model(_separable_dataset())

    probabilities = predict_outcome_probabilities(
        model, _features(home_form_points=3.0, table_points_diff=9.0)
    )

    assert probabilities["home"] == max(probabilities.values())
