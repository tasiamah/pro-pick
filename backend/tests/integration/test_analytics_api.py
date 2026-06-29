from __future__ import annotations

import math
from datetime import UTC, datetime

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.core.database import SessionLocal
from app.main import app
from app.models import Match, Prediction, Team, ValueBet

pytestmark = pytest.mark.integration


@pytest.fixture
def client() -> TestClient:
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture
def db_session() -> Session:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def test_get_analytics_returns_accuracy_log_loss_roi_and_trend(
    client: TestClient,
    db_session: Session,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    # Force the compute-from-predictions fallback (no active model metadata) so
    # we can assert the scoring math against the seeded prediction.
    monkeypatch.setattr("app.api.analytics.active_model_metrics", lambda: None)
    before = client.get("/analytics").json()

    home = Team(name="Analytics Home", logo_url=None)
    away = Team(name="Analytics Away", logo_url=None)
    db_session.add_all([home, away])
    db_session.flush()

    finished_match = Match(
        home_team_id=home.id,
        away_team_id=away.id,
        kickoff=datetime(2026, 6, 1, 15, 0, tzinfo=UTC),
        status="finished",
        home_goals=2,
        away_goals=1,
    )
    db_session.add(finished_match)
    db_session.flush()

    db_session.add_all(
        [
            Prediction(
                match_id=finished_match.id,
                prob_home=0.7,
                prob_draw=0.2,
                prob_away=0.1,
            ),
            ValueBet(
                match_id=finished_match.id,
                outcome="home",
                model_prob=0.7,
                odd=2.0,
                expected_value=0.4,
                edge=0.2,
                recommended_stake=10.0,
                settled=True,
                profit=1.0,
                created_at=datetime(2026, 6, 2, 12, 0, tzinfo=UTC),
            ),
        ]
    )
    db_session.commit()

    response = client.get("/analytics")

    assert response.status_code == 200
    payload = response.json()
    assert payload["total_value_bets"] == before["total_value_bets"] + 1
    assert payload["settled_value_bets"] == before["settled_value_bets"] + 1
    assert payload["accuracy"] is not None
    assert round(payload["log_loss"], 6) == round(-math.log(0.7), 6)
    assert payload["roi"] is not None
    assert any(point["date"] == "2026-06-02" for point in payload["roi_trend"])


def test_get_analytics_returns_empty_state_without_data(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    # Without an active model and without data, accuracy/log_loss are unknown.
    monkeypatch.setattr("app.api.analytics.active_model_metrics", lambda: None)
    response = client.get("/analytics")

    assert response.status_code == 200
    payload = response.json()
    assert payload["accuracy"] is None
    assert payload["log_loss"] is None
    assert payload["roi"] is None
    assert payload["total_value_bets"] == 0
    assert payload["settled_value_bets"] == 0
    assert payload["roi_trend"] == []


def test_get_analytics_surfaces_active_model_metadata(client: TestClient) -> None:
    from app.services.prediction import load_active_model

    bundle = load_active_model()
    assert bundle is not None, "a pretrained baseline model should be shipped"
    metrics = bundle.metadata.metrics

    payload = client.get("/analytics").json()

    assert payload["accuracy"] == metrics["accuracy"]
    assert payload["log_loss"] == metrics["log_loss"]
    assert payload["confident_accuracy"] == metrics["confident_accuracy"]
    assert payload["confident_coverage"] == metrics["confident_coverage"]
    assert payload["confidence_threshold"] == metrics["confidence_threshold"]
