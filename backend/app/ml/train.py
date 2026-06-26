"""Model training pipeline with versioned persistence (EPIC-3 / PP-57).

Builds the point-in-time training dataset, fits the requested algorithm
(logistic regression or XGBoost), records training metrics, and writes a
versioned model bundle that the prediction service loads at runtime.
"""

from __future__ import annotations

from collections.abc import Callable
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import SessionLocal
from app.ml.baseline import train_baseline_model
from app.ml.evaluation import evaluate_model
from app.ml.features import FEATURE_COLUMNS, build_training_dataset
from app.ml.storage import (
    DEFAULT_MODEL_PATH,
    ModelBundle,
    ModelMetadata,
    make_version,
    save_model,
)
from app.ml.xgboost_model import tune_xgboost_model

TRAINERS: dict[str, Callable[[Any], Any]] = {
    "logistic": train_baseline_model,
    "xgboost": tune_xgboost_model,
}


def train_model(
    db: Session,
    *,
    algorithm: str = "logistic",
    path: Path = DEFAULT_MODEL_PATH,
) -> ModelBundle:
    if algorithm not in TRAINERS:
        raise ValueError(f"unknown algorithm: {algorithm}")

    dataset = build_training_dataset(db)
    if not dataset.features:
        raise ValueError("cannot train a model without training data")

    model = TRAINERS[algorithm](dataset)
    metrics = evaluate_model(model, dataset)
    bundle = ModelBundle(
        model=model,
        metadata=ModelMetadata(
            version=make_version(algorithm),
            algorithm=algorithm,
            trained_at=datetime.now(UTC).isoformat(),
            n_samples=metrics.sample_size,
            feature_columns=list(FEATURE_COLUMNS),
            metrics={"accuracy": metrics.accuracy, "log_loss": metrics.log_loss},
        ),
    )
    save_model(bundle, path)
    return bundle


def main() -> None:
    db = SessionLocal()
    try:
        bundle = train_model(db, algorithm=settings.model_algorithm)
    finally:
        db.close()
    print(
        f"Trained {bundle.metadata.version} on {bundle.metadata.n_samples} matches "
        f"(accuracy={bundle.metadata.metrics['accuracy']:.3f}, "
        f"log_loss={bundle.metadata.metrics['log_loss']:.3f})"
    )


if __name__ == "__main__":
    main()
