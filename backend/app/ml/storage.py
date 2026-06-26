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
