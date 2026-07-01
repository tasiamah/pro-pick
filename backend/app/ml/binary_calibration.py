"""Isotonic calibration for binary market models."""

from __future__ import annotations

from collections.abc import Callable, Sequence
from typing import Any

import numpy as np
from sklearn.isotonic import IsotonicRegression

from app.ml.baseline import feature_vector
from app.ml.binary_model import _positive_class
from app.ml.features import TrainingDataset

TrainFn = Callable[[TrainingDataset], Any]


class CalibratedBinaryClassifier:
    def __init__(
        self,
        base: Any,
        calibrator: IsotonicRegression,
        positive_index: int,
        positive_label: str,
        negative_label: str,
    ) -> None:
        self._base = base
        self._calibrator = calibrator
        self._positive_index = positive_index
        self._positive_label = positive_label
        self._negative_label = negative_label
        self.classes_ = np.asarray([negative_label, positive_label])

    def predict_proba(self, features: Sequence[Sequence[float]]) -> np.ndarray:
        raw = np.asarray(self._base.predict_proba(features), dtype=float)
        positive = raw[:, self._positive_index]
        calibrated_positive = self._calibrator.predict(positive)
        calibrated_negative = 1.0 - calibrated_positive
        return np.column_stack([calibrated_negative, calibrated_positive])


def fit_binary_calibrated_model(
    base: Any,
    features: Sequence[dict[str, float]],
    labels: Sequence[str],
    *,
    positive_label: str,
    negative_label: str,
) -> CalibratedBinaryClassifier:
    raw = np.asarray(
        base.predict_proba([feature_vector(row) for row in features]), dtype=float
    )
    positive_index = _positive_class(base)
    targets = [1.0 if label == positive_label else 0.0 for label in labels]
    calibrator = IsotonicRegression(out_of_bounds="clip", y_min=0.0, y_max=1.0)
    calibrator.fit(raw[:, positive_index], targets)
    return CalibratedBinaryClassifier(
        base,
        calibrator,
        positive_index,
        positive_label,
        negative_label,
    )


def train_binary_calibrated_model(
    dataset: TrainingDataset,
    *,
    train_fn: TrainFn,
    positive_label: str,
    negative_label: str,
    holdout_fraction: float = 0.3,
) -> Any:
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
    return fit_binary_calibrated_model(
        base,
        dataset.features[split:],
        holdout_labels,
        positive_label=positive_label,
        negative_label=negative_label,
    )
