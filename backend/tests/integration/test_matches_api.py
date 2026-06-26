"""Integration tests for the matches API."""

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


def test_list_matches_returns_odds_in_stable_bookmaker_order(
    client: TestClient,
    db_session: Session,
) -> None:
    competition = Competition(name="La Liga", country="Spain")
    home_team = Team(name="Barcelona", logo_url=None)
    away_team = Team(name="Madrid", logo_url=None)
    db_session.add_all([competition, home_team, away_team])
    db_session.flush()

    match = Match(
        competition_id=competition.id,
        home_team_id=home_team.id,
        away_team_id=away_team.id,
        kickoff=datetime.utcnow() + timedelta(days=2),
        status="scheduled",
    )
    db_session.add(match)
    db_session.flush()

    db_session.add_all(
        [
            Odds(
                match_id=match.id,
                bookmaker="Zeta",
                home=2.1,
                draw=3.1,
                away=3.9,
            ),
            Odds(
                match_id=match.id,
                bookmaker="Alpha",
                home=2.0,
                draw=3.0,
                away=4.0,
            ),
        ]
    )
    db_session.commit()

    response = client.get("/matches")

    assert response.status_code == 200
    match_payload = next(item for item in response.json() if item["id"] == match.id)
    assert [odds["bookmaker"] for odds in match_payload["odds"]] == ["Alpha", "Zeta"]


def test_list_matches_filters_by_kickoff_window(
    client: TestClient,
    db_session: Session,
) -> None:
    competition = Competition(name="Bundesliga", country="Germany")
    home_team = Team(name="Bayern", logo_url=None)
    away_team = Team(name="Dortmund", logo_url=None)
    db_session.add_all([competition, home_team, away_team])
    db_session.flush()

    window_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    in_window_match = Match(
        competition_id=competition.id,
        home_team_id=home_team.id,
        away_team_id=away_team.id,
        kickoff=window_start + timedelta(days=3),
        status="scheduled",
    )
    out_of_window_match = Match(
        competition_id=competition.id,
        home_team_id=home_team.id,
        away_team_id=away_team.id,
        kickoff=window_start + timedelta(days=10),
        status="scheduled",
    )
    db_session.add_all([in_window_match, out_of_window_match])
    db_session.commit()

    response = client.get(
        "/matches",
        params={
            "kickoff_from": window_start.isoformat(),
            "kickoff_to": (window_start + timedelta(days=7)).isoformat(),
            "limit": 200,
        },
    )

    assert response.status_code == 200
    match_ids = {item["id"] for item in response.json()}
    assert in_window_match.id in match_ids
    assert out_of_window_match.id not in match_ids


def test_get_match_returns_detail_with_prediction_and_odds(
    client: TestClient,
    db_session: Session,
) -> None:
    competition = Competition(name="Serie A", country="Italy")
    home_team = Team(name="Juventus", logo_url=None)
    away_team = Team(name="Napoli", logo_url=None)
    db_session.add_all([competition, home_team, away_team])
    db_session.flush()

    match = Match(
        competition_id=competition.id,
        home_team_id=home_team.id,
        away_team_id=away_team.id,
        kickoff=datetime.utcnow() + timedelta(days=1),
        status="scheduled",
    )
    db_session.add(match)
    db_session.flush()

    db_session.add_all(
        [
            Prediction(
                match_id=match.id,
                prob_home=0.6,
                prob_draw=0.25,
                prob_away=0.15,
            ),
            Odds(
                match_id=match.id,
                bookmaker="Demo",
                home=1.7,
                draw=3.6,
                away=5.0,
            ),
        ]
    )
    db_session.commit()

    response = client.get(f"/matches/{match.id}")

    assert response.status_code == 200
    payload = response.json()
    assert payload["id"] == match.id
    assert payload["competition_name"] == "Serie A"
    assert payload["prediction"]["prob_home"] == 0.6
    assert payload["odds"][0]["bookmaker"] == "Demo"
    assert payload["odds"][0]["home"] == 1.7


def test_get_match_returns_404_for_unknown_id(client: TestClient) -> None:
    response = client.get("/matches/999999")

    assert response.status_code == 404
    assert response.json()["detail"] == "Match not found"
