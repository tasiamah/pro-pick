"""Model training pipeline with versioned persistence (EPIC-3 / PP-57).

Builds the point-in-time training dataset, fits the requested algorithm
(logistic regression or XGBoost), optionally calibrates it, evaluates it
out-of-sample with walk-forward backtesting, and writes a versioned model
bundle that the prediction service loads at runtime.
"""

from __future__ import annotations

from collections.abc import Callable
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import SessionLocal
from app.ml.backtest import backtest_model
from app.ml.baseline import train_baseline_model
from app.ml.calibration import train_calibrated_model
from app.ml.evaluation import EvaluationMetrics, evaluate_model
from app.ml.features import FEATURE_COLUMNS, TrainingDataset, build_training_dataset
from app.ml.storage import (
    DEFAULT_MODEL_PATH,
    ModelBundle,
    ModelMetadata,
    make_version,
    save_model,
)
from app.ml.xgboost_model import tune_xgboost_model

TrainFn = Callable[[TrainingDataset], Any]

TRAINERS: dict[str, TrainFn] = {
    "logistic": train_baseline_model,
    "xgboost": tune_xgboost_model,
}

CALIBRATION_MIN_SAMPLES = 50


def train_model(
    db: Session,
    *,
    algorithm: str = "logistic",
    calibrate: bool | None = None,
    path: Path = DEFAULT_MODEL_PATH,
) -> ModelBundle:
    if algorithm not in TRAINERS:
        raise ValueError(f"unknown algorithm: {algorithm}")

    dataset = build_training_dataset(db)
    if not dataset.features:
        raise ValueError("cannot train a model without training data")

    train_fn = TRAINERS[algorithm]
    should_calibrate = (
        settings.model_calibrate if calibrate is None else calibrate
    ) and len(dataset.features) >= CALIBRATION_MIN_SAMPLES

    model = (
        train_calibrated_model(dataset, train_fn=train_fn)
        if should_calibrate
        else train_fn(dataset)
    )

    metrics, evaluation = _evaluate(dataset, model, train_fn)
    bundle = ModelBundle(
        model=model,
        metadata=ModelMetadata(
            version=make_version(algorithm),
            algorithm=algorithm,
            trained_at=datetime.now(UTC).isoformat(),
            n_samples=len(dataset.features),
            feature_columns=list(FEATURE_COLUMNS),
            metrics={
                "accuracy": metrics.accuracy,
                "log_loss": metrics.log_loss,
                "brier": metrics.brier,
            },
            evaluation=evaluation,
            calibrated=should_calibrate,
        ),
    )
    save_model(bundle, path)
    return bundle


def _evaluate(
    dataset: TrainingDataset, model: Any, train_fn: TrainFn
) -> tuple[EvaluationMetrics, str]:
    backtest = backtest_model(dataset, train_fn=train_fn)
    if backtest.sample_size > 0:
        return backtest, "walk_forward"
    return evaluate_model(model, dataset), "in_sample"


def main() -> None:
    db = SessionLocal()
    try:
        bundle = train_model(db, algorithm=settings.model_algorithm)
    finally:
        db.close()
    print(
        f"Trained {bundle.metadata.version} on {bundle.metadata.n_samples} matches "
        f"[{bundle.metadata.evaluation}] "
        f"(accuracy={bundle.metadata.metrics['accuracy']:.3f}, "
        f"log_loss={bundle.metadata.metrics['log_loss']:.3f}, "
        f"brier={bundle.metadata.metrics['brier']:.3f})"
    )


if __name__ == "__main__":
    main()
