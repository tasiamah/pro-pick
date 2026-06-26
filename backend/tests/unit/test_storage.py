from __future__ import annotations

from datetime import datetime
from pathlib import Path

import joblib
import pytest

from app.ml.storage import (
    ModelBundle,
    ModelMetadata,
    load_model,
    make_version,
    save_model,
)

pytestmark = pytest.mark.unit


def _metadata() -> ModelMetadata:
    return ModelMetadata(
        version="logistic-20240301T120000",
        algorithm="logistic",
        trained_at="2024-03-01T12:00:00+00:00",
        n_samples=42,
        feature_columns=["home_form_points", "away_form_points"],
        metrics={"accuracy": 0.5, "log_loss": 1.0},
    )


def test_make_version_includes_algorithm_and_timestamp() -> None:
    version = make_version("xgboost", now=datetime(2024, 3, 1, 12, 30, 15))

    assert version == "xgboost-20240301T123015"


def test_save_and_load_round_trip(tmp_path: Path) -> None:
    bundle = ModelBundle(model={"weights": [1, 2, 3]}, metadata=_metadata())
    path = tmp_path / "model.pkl"

    saved_path = save_model(bundle, path)
    loaded = load_model(path)

    assert saved_path == path
    assert loaded is not None
    assert loaded.model == {"weights": [1, 2, 3]}
    assert loaded.metadata == _metadata()


def test_load_model_returns_none_when_missing(tmp_path: Path) -> None:
    assert load_model(tmp_path / "absent.pkl") is None


def test_load_model_rejects_non_bundle_artifact(tmp_path: Path) -> None:
    path = tmp_path / "untrusted.pkl"
    joblib.dump({"not": "a bundle"}, path)

    with pytest.raises(TypeError):
        load_model(path)
