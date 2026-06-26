from __future__ import annotations

import pytest

from app.ml.backtest import backtest_model, walk_forward_windows
from app.ml.baseline import train_baseline_model
from app.ml.features import FEATURE_COLUMNS, TrainingDataset

pytestmark = pytest.mark.unit


def _features(**overrides: float) -> dict[str, float]:
    base = {column: 0.0 for column in FEATURE_COLUMNS}
    base.update(overrides)
    return base


def _separable_dataset(blocks: int = 4) -> TrainingDataset:
    features = []
    labels = []
    for _ in range(blocks):
        features.append(_features(home_form_points=3.0, table_points_diff=9.0))
        labels.append("home")
        features.append(_features(away_form_points=3.0, table_points_diff=-9.0))
        labels.append("away")
        features.append(_features(home_form_points=1.0, away_form_points=1.0))
        labels.append("draw")
    return TrainingDataset(
        match_ids=list(range(len(features))),
        features=features,
        labels=labels,
    )


def test_walk_forward_windows_expand_without_gaps() -> None:
    windows = walk_forward_windows(10, min_train_size=4, step=2)

    assert windows == [(4, 6), (6, 8), (8, 10)]


def test_walk_forward_windows_empty_when_train_covers_all() -> None:
    assert walk_forward_windows(5, min_train_size=5, step=2) == []


def test_backtest_model_produces_out_of_sample_metrics() -> None:
    metrics = backtest_model(_separable_dataset(), train_fn=train_baseline_model)

    assert metrics.sample_size > 0
    assert 0.0 <= metrics.accuracy <= 1.0
    assert metrics.log_loss > 0.0
    assert 0.0 <= metrics.brier <= 2.0
