"""Probability calibration for the 1X2 model (EPIC-3 / PP-56).

Wraps a trained classifier with per-class (one-vs-rest) isotonic regression fit
on a chronological hold-out, then renormalizes so the calibrated home/draw/away
probabilities still sum to one. Calibrated probabilities are what value betting
actually depends on, and this wrapper only needs ``predict_proba``/``classes_``
so it works for both the logistic and XGBoost models.
"""

from __future__ import annotations

from collections.abc import Callable, Sequence
from typing import Any

import numpy as np
from sklearn.isotonic import IsotonicRegression

from app.ml.baseline import feature_vector
from app.ml.features import TrainingDataset

TrainFn = Callable[[TrainingDataset], Any]


class CalibratedClassifier:
    """Apply per-class isotonic calibration on top of a base classifier."""

    def __init__(
        self,
        base: Any,
        calibrators: dict[Any, IsotonicRegression],
        classes: np.ndarray,
    ) -> None:
        self._base = base
        self._calibrators = calibrators
        self.classes_ = classes

    def predict_proba(self, features: Sequence[Sequence[float]]) -> np.ndarray:
        raw = np.asarray(self._base.predict_proba(features), dtype=float)
        calibrated = np.zeros_like(raw)
        for column, label in enumerate(self.classes_):
            calibrator = self._calibrators.get(label)
            if calibrator is None:
                calibrated[:, column] = raw[:, column]
            else:
                calibrated[:, column] = calibrator.predict(raw[:, column])
        totals = calibrated.sum(axis=1, keepdims=True)
        totals[totals == 0] = 1.0
        return calibrated / totals


def fit_calibrated_model(
    base: Any,
    features: Sequence[dict[str, float]],
    labels: Sequence[str],
) -> CalibratedClassifier:
    raw = np.asarray(
        base.predict_proba([feature_vector(row) for row in features]), dtype=float
    )
    classes = np.asarray(base.classes_)
    calibrators: dict[Any, IsotonicRegression] = {}
    for column, label in enumerate(classes):
        targets = [1.0 if outcome == label else 0.0 for outcome in labels]
        calibrator = IsotonicRegression(out_of_bounds="clip", y_min=0.0, y_max=1.0)
        calibrator.fit(raw[:, column], targets)
        calibrators[label] = calibrator
    return CalibratedClassifier(base, calibrators, classes)


def train_calibrated_model(
    dataset: TrainingDataset,
    *,
    train_fn: TrainFn,
    holdout_fraction: float = 0.3,
) -> Any:
    """Train on the earlier matches, calibrate on the later hold-out."""
    sample_size = len(dataset.features)
    split = int(sample_size * (1.0 - holdout_fraction))
    train_labels = dataset.labels[:split]
    holdout_labels = dataset.labels[split:]
    if (
        split < 1
        or split >= sample_size
        or len(set(train_labels)) < 2
        or not holdout_labels
    ):
        return train_fn(dataset)

    base = train_fn(
        TrainingDataset(
            match_ids=dataset.match_ids[:split],
            features=dataset.features[:split],
            labels=dataset.labels[:split],
        )
    )
    return fit_calibrated_model(base, dataset.features[split:], holdout_labels)
