"""Training pipeline for BTTS, Over/Under 2.5, and Double Chance market models."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from sqlalchemy.orm import Session

from app.core.config import settings
from app.ml.binary_calibration import train_binary_calibrated_model
from app.ml.binary_model import (
    evaluate_binary_model,
    train_binary_model,
)
from app.ml.evaluation import EvaluationMetrics
from app.ml.features import FEATURE_COLUMNS
from app.ml.market_labels import (
    MARKET_DOUBLE_CHANCE,
    MARKET_OUTCOMES,
    SUPPORTED_MARKETS,
    build_double_chance_binary_targets,
    build_market_training_dataset,
)
from app.ml.storage import (
    ModelBundle,
    ModelMetadata,
    make_version,
    resolve_market_model_path,
    save_model,
)

CALIBRATION_MIN_SAMPLES = 50


@dataclass(frozen=True)
class DoubleChanceModel:
    """Three calibrated binary legs stored as one market artifact."""

    models: dict[str, Any]


def train_market_model(
    db: Session,
    market: str,
    *,
    calibrate: bool | None = None,
    path: Path | None = None,
) -> ModelBundle:
    if market not in SUPPORTED_MARKETS:
        raise ValueError(f"unknown market: {market}")

    resolved_path = path or resolve_market_model_path(market, settings.model_path)
    should_calibrate = settings.model_calibrate if calibrate is None else calibrate

    if market == MARKET_DOUBLE_CHANCE:
        return _train_double_chance_model(
            db,
            should_calibrate=should_calibrate,
            path=resolved_path,
        )

    dataset = build_market_training_dataset(db, market)
    if not dataset.features:
        raise ValueError(f"cannot train {market} model without training data")

    positive, negative = MARKET_OUTCOMES[market]
    enough_samples = len(dataset.features) >= CALIBRATION_MIN_SAMPLES
    use_calibration = should_calibrate and enough_samples
    model = (
        train_binary_calibrated_model(
            dataset,
            train_fn=train_binary_model,
            positive_label=positive,
            negative_label=negative,
        )
        if use_calibration
        else train_binary_model(dataset)
    )
    metrics = evaluate_binary_model(model, dataset, outcomes=MARKET_OUTCOMES[market])
    bundle = ModelBundle(
        model=model,
        metadata=ModelMetadata(
            version=make_version(f"{market}-logistic"),
            algorithm="logistic",
            trained_at=datetime.now(UTC).isoformat(),
            n_samples=len(dataset.features),
            feature_columns=list(FEATURE_COLUMNS),
            metrics=_metrics_dict(metrics),
            evaluation="in_sample",
            calibrated=use_calibration,
        ),
    )
    save_model(bundle, resolved_path)
    return bundle


def train_all_market_models(
    db: Session,
    *,
    calibrate: bool | None = None,
    model_path: str = "",
) -> dict[str, ModelBundle]:
    bundles: dict[str, ModelBundle] = {}
    for market in SUPPORTED_MARKETS:
        bundles[market] = train_market_model(
            db,
            market,
            calibrate=calibrate,
            path=resolve_market_model_path(market, model_path),
        )
    return bundles


def _train_double_chance_model(
    db: Session,
    *,
    should_calibrate: bool,
    path: Path,
) -> ModelBundle:
    features, targets = build_double_chance_binary_targets(db)
    if not features:
        raise ValueError("cannot train double chance model without training data")

    outcomes = MARKET_OUTCOMES[MARKET_DOUBLE_CHANCE]
    from app.ml.features import TrainingDataset

    models: dict[str, Any] = {}
    for outcome in outcomes:
        labels = [str(value) for value in targets[outcome]]
        dataset = TrainingDataset(
            match_ids=list(range(len(features))),
            features=features,
            labels=labels,
        )
        use_calibration = should_calibrate and len(features) >= CALIBRATION_MIN_SAMPLES
        if use_calibration and len(set(labels)) >= 2:
            models[outcome] = train_binary_calibrated_model(
                dataset,
                train_fn=train_binary_model,
                positive_label="1",
                negative_label="0",
            )
        elif len(set(labels)) >= 2:
            models[outcome] = train_binary_model(dataset)
        else:
            continue

    bundle = ModelBundle(
        model=DoubleChanceModel(models=models),
        metadata=ModelMetadata(
            version=make_version("double_chance-logistic"),
            algorithm="logistic",
            trained_at=datetime.now(UTC).isoformat(),
            n_samples=len(features),
            feature_columns=list(FEATURE_COLUMNS),
            metrics={"accuracy": 0.0, "log_loss": 0.0, "brier": 0.0},
            evaluation="in_sample",
            calibrated=should_calibrate,
        ),
    )
    save_model(bundle, path)
    return bundle


def _metrics_dict(metrics: EvaluationMetrics) -> dict[str, float]:
    return {
        "accuracy": metrics.accuracy,
        "log_loss": metrics.log_loss,
        "brier": metrics.brier,
        "confident_accuracy": metrics.confident_accuracy,
        "confident_coverage": metrics.confident_coverage,
        "confidence_threshold": metrics.confidence_threshold,
    }
