"""XGBoost 1X2 model with light tuning (EPIC-3 / PP-55).

A gradient-boosted classifier over the same feature vector as the baseline.
XGBoost needs integer targets, so a small wrapper label-encodes the 1X2
outcomes while exposing the original string classes for probability mapping.
Tuning uses a chronological hold-out so it never validates on past matches.
"""

from __future__ import annotations

import math
from collections.abc import Mapping, Sequence
from typing import Any

from sklearn.preprocessing import LabelEncoder
from xgboost import XGBClassifier

from app.ml.baseline import feature_vector, predict_outcome_probabilities
from app.ml.evaluation import multiclass_log_loss
from app.ml.features import TrainingDataset

RANDOM_STATE = 42

DEFAULT_PARAMS: dict[str, Any] = {
    "n_estimators": 200,
    "max_depth": 3,
    "learning_rate": 0.1,
    "subsample": 0.9,
    "colsample_bytree": 0.9,
    "n_jobs": 1,
}

DEFAULT_PARAM_GRID: tuple[dict[str, Any], ...] = (
    {"max_depth": 2, "n_estimators": 100, "learning_rate": 0.1},
    {"max_depth": 3, "n_estimators": 200, "learning_rate": 0.1},
    {"max_depth": 4, "n_estimators": 300, "learning_rate": 0.05},
)


class LabelEncodedClassifier:
    """Wrap a classifier so it trains on encoded labels but reports strings."""

    def __init__(self, estimator: Any) -> None:
        self.estimator = estimator
        self._encoder = LabelEncoder()
        self.classes_: Any = None

    def fit(
        self, features: Sequence[Sequence[float]], labels: Sequence[str]
    ) -> LabelEncodedClassifier:
        encoded = self._encoder.fit_transform(labels)
        self.estimator.fit(features, encoded)
        self.classes_ = self._encoder.classes_
        return self

    def predict_proba(self, features: Sequence[Sequence[float]]) -> Any:
        return self.estimator.predict_proba(features)


def build_xgboost_model(**params: Any) -> LabelEncodedClassifier:
    merged = {**DEFAULT_PARAMS, **params}
    return LabelEncodedClassifier(
        XGBClassifier(
            random_state=RANDOM_STATE,
            eval_metric="mlogloss",
            **merged,
        )
    )


def train_xgboost_model(
    dataset: TrainingDataset, **params: Any
) -> LabelEncodedClassifier:
    if not dataset.features:
        raise ValueError("cannot train an xgboost model without training data")
    model = build_xgboost_model(**params)
    model.fit([feature_vector(row) for row in dataset.features], dataset.labels)
    return model


def tune_xgboost_model(
    dataset: TrainingDataset,
    *,
    param_grid: Sequence[Mapping[str, Any]] | None = None,
    validation_fraction: float = 0.3,
) -> LabelEncodedClassifier:
    """Pick params on a chronological hold-out, then refit on all matches."""
    grid = param_grid or DEFAULT_PARAM_GRID
    sample_size = len(dataset.features)
    split = int(sample_size * (1.0 - validation_fraction))
    if split < 1 or split >= sample_size or len(set(dataset.labels)) < 2:
        return train_xgboost_model(dataset)

    train_split = TrainingDataset(
        match_ids=dataset.match_ids[:split],
        features=dataset.features[:split],
        labels=dataset.labels[:split],
    )
    validation = list(
        zip(dataset.features[split:], dataset.labels[split:], strict=True)
    )

    best_params: Mapping[str, Any] = grid[0]
    best_loss = math.inf
    for params in grid:
        candidate = train_xgboost_model(train_split, **params)
        losses = [
            multiclass_log_loss(
                predict_outcome_probabilities(candidate, features), outcome
            )
            for features, outcome in validation
        ]
        loss = sum(losses) / len(losses)
        if loss < best_loss:
            best_loss = loss
            best_params = params

    return train_xgboost_model(dataset, **best_params)
