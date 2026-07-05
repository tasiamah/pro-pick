"""Binary logistic models for BTTS and Over/Under 2.5 markets."""

from __future__ import annotations

from collections.abc import Mapping

from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler

from app.ml.baseline import feature_vector
from app.ml.features import TrainingDataset

RANDOM_STATE = 42
MAX_ITER = 1000


def build_binary_model() -> Pipeline:
    return Pipeline(
        [
            ("scaler", StandardScaler()),
            (
                "classifier",
                LogisticRegression(max_iter=MAX_ITER, random_state=RANDOM_STATE),
            ),
        ]
    )


def train_binary_model(dataset: TrainingDataset) -> Pipeline:
    if not dataset.features:
        raise ValueError("cannot train a binary model without training data")
    if len(set(dataset.labels)) < 2:
        raise ValueError("binary model requires at least two label classes")

    model = build_binary_model()
    model.fit([feature_vector(row) for row in dataset.features], dataset.labels)
    return model


def predict_binary_probabilities(
    model: Pipeline,
    features: Mapping[str, float],
    *,
    outcomes: tuple[str, ...],
) -> dict[str, float]:
    probabilities = model.predict_proba([feature_vector(features)])[0]
    by_class = {
        str(label): float(probability)
        for label, probability in zip(model.classes_, probabilities, strict=True)
    }
    return {outcome: by_class.get(outcome, 0.0) for outcome in outcomes}


def _positive_class(model: Pipeline) -> int:
    classes = list(model.classes_)
    if "1" in classes:
        return classes.index("1")
    if len(classes) == 2:
        return 1
    return 0


def evaluate_binary_model(
    model: Pipeline,
    dataset: TrainingDataset,
    *,
    outcomes: tuple[str, ...],
):
    from app.ml.evaluation import evaluate_scored_outcomes

    rows = [
        (
            predict_binary_probabilities(model, features, outcomes=outcomes),
            label,
        )
        for features, label in zip(dataset.features, dataset.labels, strict=True)
    ]
    return evaluate_scored_outcomes(rows)
