"""Baseline 1X2 model (EPIC-3 / PP-54).

A multinomial logistic-regression model trained on the historical feature
dataset from ``app/ml/features.py``. It produces home/draw/away probabilities
for a match and serves as the default algorithm for the training pipeline and
prediction service.
"""

from __future__ import annotations

from collections.abc import Mapping

from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler

from app.ml.features import (
    FEATURE_COLUMNS,
    OUTCOME_AWAY,
    OUTCOME_DRAW,
    OUTCOME_HOME,
    TrainingDataset,
)

RANDOM_STATE = 42
MAX_ITER = 1000
OUTCOMES = (OUTCOME_HOME, OUTCOME_DRAW, OUTCOME_AWAY)


def feature_vector(features: Mapping[str, float]) -> list[float]:
    """Order a feature mapping into the stable model input vector."""
    return [features[column] for column in FEATURE_COLUMNS]


def build_baseline_model() -> Pipeline:
    """Standardize features, then fit multinomial logistic regression."""
    return Pipeline(
        [
            ("scaler", StandardScaler()),
            (
                "classifier",
                LogisticRegression(max_iter=MAX_ITER, random_state=RANDOM_STATE),
            ),
        ]
    )


def train_baseline_model(dataset: TrainingDataset) -> Pipeline:
    if not dataset.features:
        raise ValueError("cannot train a baseline model without training data")

    model = build_baseline_model()
    model.fit([feature_vector(row) for row in dataset.features], dataset.labels)
    return model


def predict_outcome_probabilities(
    model: Pipeline, features: Mapping[str, float]
) -> dict[str, float]:
    """Home/draw/away probabilities for a single match's features."""
    probabilities = model.predict_proba([feature_vector(features)])[0]
    by_outcome = {
        outcome: float(probability)
        for outcome, probability in zip(model.classes_, probabilities, strict=True)
    }
    return {outcome: by_outcome.get(outcome, 0.0) for outcome in OUTCOMES}
