"""Training pipeline for the BTTS and Over/Under 2.5 market models."""

from __future__ import annotations

from datetime import UTC, datetime
from pathlib import Path

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
    MARKET_OUTCOMES,
    SUPPORTED_MARKETS,
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


def _metrics_dict(metrics: EvaluationMetrics) -> dict[str, float]:
    return {
        "accuracy": metrics.accuracy,
        "log_loss": metrics.log_loss,
        "brier": metrics.brier,
        "confident_accuracy": metrics.confident_accuracy,
        "confident_coverage": metrics.confident_coverage,
        "confidence_threshold": metrics.confidence_threshold,
    }
