"""Binary logistic models for BTTS and Over/Under 2.5 markets."""

from __future__ import annotations

from collections.abc import Mapping, Sequence

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


def train_multi_binary_models(
    features: Sequence[dict[str, float]],
    targets: dict[str, Sequence[int]],
    *,
    outcomes: tuple[str, ...],
) -> dict[str, Pipeline]:
    models: dict[str, Pipeline] = {}
    for outcome in outcomes:
        labels = [str(value) for value in targets[outcome]]
        if len(set(labels)) < 2:
            continue
        model = build_binary_model()
        model.fit([feature_vector(row) for row in features], labels)
        models[outcome] = model
    return models


def predict_multi_binary_probabilities(
    models: Mapping[str, Pipeline],
    features: Mapping[str, float],
    *,
    outcomes: tuple[str, ...],
    neutral: Mapping[str, float],
) -> dict[str, float]:
    resolved: dict[str, float] = {}
    for outcome in outcomes:
        model = models.get(outcome)
        if model is None:
            resolved[outcome] = float(neutral[outcome])
            continue
        positive = _positive_class(model)
        raw = model.predict_proba([feature_vector(features)])[0]
        probability = float(raw[positive])
        resolved[outcome] = probability
    return resolved


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
