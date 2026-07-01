"""Shared setup for backend integration tests."""

from __future__ import annotations

import subprocess
import sys
from collections.abc import Iterator
from pathlib import Path

import pytest

from app.core.database import SessionLocal
from app.core.rate_limit import rate_limit_store
from app.models import (
    Competition,
    MarketPrediction,
    Match,
    Odds,
    Prediction,
    Team,
    ValueBet,
)

BACKEND_DIR = Path(__file__).resolve().parents[2]

CLEANUP_MODELS = (
    ValueBet,
    Odds,
    MarketPrediction,
    Prediction,
    Match,
    Team,
    Competition,
)


@pytest.fixture(scope="session", autouse=True)
def apply_migrations() -> None:
    result = subprocess.run(
        [sys.executable, "-m", "alembic", "upgrade", "head"],
        cwd=BACKEND_DIR,
        capture_output=True,
        text=True,
        check=False,
        timeout=60,
    )

    assert result.returncode == 0, result.stderr or result.stdout


@pytest.fixture(autouse=True)
def reset_rate_limit_store() -> None:
    rate_limit_store.clear()


@pytest.fixture(autouse=True)
def reset_database() -> Iterator[None]:
    from app.services.analytics import clear_model_metrics_cache

    clear_model_metrics_cache()
    yield
    session = SessionLocal()
    try:
        for model in CLEANUP_MODELS:
            session.query(model).delete()
        session.commit()
    finally:
        session.close()
    clear_model_metrics_cache()
