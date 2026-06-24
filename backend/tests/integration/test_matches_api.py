"""Integration tests for the matches list API."""

from __future__ import annotations

from datetime import datetime, timedelta

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.core.database import SessionLocal
from app.main import app
from app.models import Competition, Match, Odds, Prediction, Team

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


def test_list_matches_returns_upcoming_with_prediction_and_odds(
    client: TestClient,
    db_session: Session,
) -> None:
    competition = Competition(name="Premier League", country="England")
    home_team = Team(name="Arsenal", logo_url=None)
    away_team = Team(name="Chelsea", logo_url=None)
    db_session.add_all([competition, home_team, away_team])
    db_session.flush()

    upcoming_kickoff = datetime.utcnow() + timedelta(days=1)
    past_kickoff = datetime.utcnow() - timedelta(days=1)

    upcoming_match = Match(
        competition_id=competition.id,
        home_team_id=home_team.id,
        away_team_id=away_team.id,
        kickoff=upcoming_kickoff,
        status="scheduled",
    )
    past_match = Match(
        competition_id=competition.id,
        home_team_id=home_team.id,
        away_team_id=away_team.id,
        kickoff=past_kickoff,
        status="finished",
    )
    db_session.add_all([upcoming_match, past_match])
    db_session.flush()

    db_session.add_all(
        [
            Prediction(
                match_id=upcoming_match.id,
                prob_home=0.5,
                prob_draw=0.25,
                prob_away=0.25,
            ),
            Odds(
                match_id=upcoming_match.id,
                bookmaker="Demo",
                home=1.9,
                draw=3.4,
                away=4.2,
            ),
        ]
    )
    db_session.commit()

    response = client.get("/matches")

    assert response.status_code == 200
    payload = response.json()
    upcoming_entries = [item for item in payload if item["id"] == upcoming_match.id]
    assert len(upcoming_entries) == 1
    assert upcoming_entries[0]["prediction"]["prob_home"] == 0.5
    assert upcoming_entries[0]["odds"][0]["home"] == 1.9
    assert all(item["id"] != past_match.id for item in payload)
