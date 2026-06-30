"""Integration tests for the dashboard API."""

from __future__ import annotations

from datetime import datetime, timedelta

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


def test_get_dashboard_summarizes_today_and_model_performance(
    client: TestClient,
    db_session: Session,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    # Force the compute-from-predictions fallback (no active model metadata) so
    # we can assert model_accuracy from the seeded finished match.
    monkeypatch.setattr("app.api.dashboard.active_model_metrics", lambda: None)
    now = datetime.utcnow()
    start_of_day = datetime(now.year, now.month, now.day)

    home = Team(name="Dashboard Home", logo_url=None)
    away = Team(name="Dashboard Away", logo_url=None)
    db_session.add_all([home, away])
    db_session.flush()

    today_match = Match(
        home_team_id=home.id,
        away_team_id=away.id,
        kickoff=now + timedelta(hours=2),
        status="scheduled",
    )
    future_match = Match(
        home_team_id=home.id,
        away_team_id=away.id,
        kickoff=now + timedelta(days=2),
        status="scheduled",
    )
    finished_match = Match(
        home_team_id=home.id,
        away_team_id=away.id,
        kickoff=start_of_day - timedelta(days=3),
        status="finished",
        home_goals=2,
        away_goals=1,
    )
    db_session.add_all([today_match, future_match, finished_match])
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
                match_id=today_match.id,
                outcome="home",
                model_prob=0.6,
                odd=2.0,
                expected_value=0.2,
                edge=0.3,
                recommended_stake=10.0,
            ),
            ValueBet(
                match_id=finished_match.id,
                outcome="home",
                model_prob=0.7,
                odd=2.0,
                expected_value=0.4,
                edge=0.5,
                recommended_stake=10.0,
                settled=True,
                profit=10.0,
            ),
        ]
    )
    db_session.commit()

    response = client.get("/dashboard")

    assert response.status_code == 200
    payload = response.json()
    assert payload["matches_today"] == 1
    assert payload["upcoming_matches"] >= 1
    assert payload["upcoming_value_bets"] == 1
    assert payload["model_accuracy"] == 1.0
    assert payload["roi"] == 1.0
    assert [bet["match_id"] for bet in payload["top_value_bets"]] == [today_match.id]


def test_get_dashboard_value_bets_scoped_to_upcoming_ordered_by_edge(
    client: TestClient,
    db_session: Session,
) -> None:
    now = datetime.utcnow()

    home = Team(name="Scoped Home", logo_url=None)
    away = Team(name="Scoped Away", logo_url=None)
    db_session.add_all([home, away])
    db_session.flush()

    strong_match = Match(
        home_team_id=home.id,
        away_team_id=away.id,
        kickoff=now + timedelta(hours=2),
        status="scheduled",
    )
    weak_match = Match(
        home_team_id=home.id,
        away_team_id=away.id,
        kickoff=now + timedelta(hours=4),
        status="scheduled",
    )
    started_match = Match(
        home_team_id=home.id,
        away_team_id=away.id,
        kickoff=now - timedelta(hours=3),
        status="scheduled",
    )
    db_session.add_all([strong_match, weak_match, started_match])
    db_session.flush()

    db_session.add_all(
        [
            ValueBet(
                match_id=strong_match.id,
                outcome="home",
                model_prob=0.7,
                odd=2.0,
                expected_value=0.4,
                edge=0.4,
                recommended_stake=10.0,
            ),
            ValueBet(
                match_id=weak_match.id,
                outcome="away",
                model_prob=0.55,
                odd=2.0,
                expected_value=0.1,
                edge=0.2,
                recommended_stake=10.0,
            ),
            ValueBet(
                match_id=started_match.id,
                outcome="home",
                model_prob=0.9,
                odd=2.0,
                expected_value=0.8,
                edge=0.9,
                recommended_stake=10.0,
            ),
        ]
    )
    db_session.commit()

    response = client.get("/dashboard")

    assert response.status_code == 200
    payload = response.json()
    assert payload["upcoming_value_bets"] == 2
    assert [bet["match_id"] for bet in payload["top_value_bets"]] == [
        strong_match.id,
        weak_match.id,
    ]


def test_get_dashboard_returns_empty_state_without_data(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    # Without an active model and without data, model_accuracy is unknown.
    monkeypatch.setattr("app.api.dashboard.active_model_metrics", lambda: None)
    response = client.get("/dashboard")

    assert response.status_code == 200
    payload = response.json()
    assert payload["matches_today"] == 0
    assert payload["upcoming_matches"] == 0
    assert payload["upcoming_value_bets"] == 0
    assert payload["latest_kickoff"] is None
    assert payload["top_value_bets"] == []
    assert payload["model_accuracy"] is None
    assert payload["roi"] is None


def test_get_dashboard_surfaces_active_model_metadata(client: TestClient) -> None:
    from app.services.prediction import load_active_model

    bundle = load_active_model()
    assert bundle is not None, "a pretrained baseline model should be shipped"
    metrics = bundle.metadata.metrics

    payload = client.get("/dashboard").json()

    assert payload["model_accuracy"] == metrics["accuracy"]
    assert payload["confident_accuracy"] == metrics["confident_accuracy"]
    assert payload["confident_coverage"] == metrics["confident_coverage"]
    assert payload["confidence_threshold"] == metrics["confidence_threshold"]
