"""Model persistence and versioning (EPIC-3 / PP-57).

Serializes a trained estimator together with its metadata (version,
algorithm, training timestamp, sample size, feature columns, and metrics)
as a single bundle so the prediction service can load a known, reproducible
model and report its version.

``load_model`` deserializes with joblib (pickle), which can execute code, so it
must only be pointed at trusted, app-produced artifacts; it also rejects files
that do not contain a ``ModelBundle``.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

import joblib

DEFAULT_MODEL_PATH = Path(__file__).resolve().parent / "model.pkl"

# A small, version-controlled baseline bundle shipped with the deploy so a fresh
# instance serves real predictions and honest metrics immediately, without having
# to train on startup (which is slow/memory-heavy on small hosts). A model trained
# at runtime to DEFAULT_MODEL_PATH always takes precedence over this fallback.
PRETRAINED_MODEL_PATH = Path(__file__).resolve().parent / "pretrained_model.pkl"

MARKET_MODEL_FILENAMES: dict[str, str] = {
    "btts": "btts_model.pkl",
    "over_under_25": "over_under_25_model.pkl",
}

MARKET_MODEL_PATHS: dict[str, Path] = {
    market: Path(__file__).resolve().parent / filename
    for market, filename in MARKET_MODEL_FILENAMES.items()
}


@dataclass(frozen=True)
class ModelMetadata:
    version: str
    algorithm: str
    trained_at: str
    n_samples: int
    feature_columns: list[str]
    metrics: dict[str, float]
    evaluation: str = "in_sample"
    calibrated: bool = False


@dataclass(frozen=True)
class ModelBundle:
    model: Any
    metadata: ModelMetadata


def make_version(algorithm: str, *, now: datetime | None = None) -> str:
    moment = now or datetime.now(UTC)
    return f"{algorithm}-{moment.strftime('%Y%m%dT%H%M%S')}"


def resolve_model_path(model_path: str = "") -> Path:
    return Path(model_path) if model_path else DEFAULT_MODEL_PATH


def active_model_path(model_path: str = "") -> Path:
    """Path of the model to serve: a runtime-trained model if present, else the
    shipped pretrained baseline."""
    resolved = resolve_model_path(model_path)
    if resolved.exists():
        return resolved
    return PRETRAINED_MODEL_PATH


def resolve_market_model_path(market: str, model_path: str = "") -> Path:
    if market not in MARKET_MODEL_FILENAMES:
        raise ValueError(f"unknown market: {market}")
    if model_path:
        base = Path(model_path).resolve().parent
        return base / MARKET_MODEL_FILENAMES[market]
    return MARKET_MODEL_PATHS[market]


def active_market_model_path(market: str, model_path: str = "") -> Path:
    resolved = resolve_market_model_path(market, model_path)
    if resolved.exists():
        return resolved
    return MARKET_MODEL_PATHS[market]


def save_model(bundle: ModelBundle, path: Path = DEFAULT_MODEL_PATH) -> Path:
    path.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump(bundle, path)
    return path


def load_model(path: Path = DEFAULT_MODEL_PATH) -> ModelBundle | None:
    if not Path(path).exists():
        return None
    bundle = joblib.load(path)
    if not isinstance(bundle, ModelBundle):
        raise TypeError(f"{path} does not contain a ModelBundle artifact")
    return bundle
