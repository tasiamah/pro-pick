from __future__ import annotations

import pytest

from app.ml.baseline import predict_outcome_probabilities, train_baseline_model
from app.ml.calibration import CalibratedClassifier, train_calibrated_model
from app.ml.features import FEATURE_COLUMNS, TrainingDataset

pytestmark = pytest.mark.unit


def _features(**overrides: float) -> dict[str, float]:
    base = {column: 0.0 for column in FEATURE_COLUMNS}
    base.update(overrides)
    return base


def _separable_dataset(blocks: int = 4) -> TrainingDataset:
    features = []
    labels = []
    for index in range(blocks):
        nudge = index * 0.1
        features.append(_features(home_form_points=3.0 - nudge, table_points_diff=9.0))
        labels.append("home")
        features.append(_features(away_form_points=3.0 - nudge, table_points_diff=-9.0))
        labels.append("away")
        features.append(_features(home_form_points=1.0, away_form_points=1.0))
        labels.append("draw")
    return TrainingDataset(
        match_ids=list(range(len(features))),
        features=features,
        labels=labels,
    )


def test_train_calibrated_model_returns_calibrated_classifier() -> None:
    model = train_calibrated_model(_separable_dataset(), train_fn=train_baseline_model)

    assert isinstance(model, CalibratedClassifier)
    probabilities = predict_outcome_probabilities(
        model, _features(home_form_points=3.0, table_points_diff=9.0)
    )
    assert list(probabilities.keys()) == ["home", "draw", "away"]
    assert all(0.0 <= value <= 1.0 for value in probabilities.values())
    assert round(sum(probabilities.values()), 6) == 1.0


def test_train_calibrated_model_falls_back_when_too_small() -> None:
    tiny = TrainingDataset(
        match_ids=[0, 1],
        features=[_features(home_form_points=3.0), _features(away_form_points=3.0)],
        labels=["home", "away"],
    )

    model = train_calibrated_model(tiny, train_fn=train_baseline_model)

    assert not isinstance(model, CalibratedClassifier)
    probabilities = predict_outcome_probabilities(model, _features())
    assert round(sum(probabilities.values()), 6) == 1.0
