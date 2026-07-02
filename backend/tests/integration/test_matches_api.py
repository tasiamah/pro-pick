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


def test_list_matches_returns_odds_best_price_first(
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
    assert [odds["bookmaker"] for odds in match_payload["odds"]] == ["Zeta", "Alpha"]


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
    assert payload["home_goals"] is None
    assert payload["away_goals"] is None


def test_list_matches_includes_scores_for_live_and_finished(
    client: TestClient,
    db_session: Session,
) -> None:
    home_team = Team(name="Live Home", logo_url=None)
    away_team = Team(name="Live Away", logo_url=None)
    db_session.add_all([home_team, away_team])
    db_session.flush()

    live_match = Match(
        home_team_id=home_team.id,
        away_team_id=away_team.id,
        kickoff=datetime.utcnow() - timedelta(minutes=30),
        status="live",
        home_goals=2,
        away_goals=1,
    )
    finished_match = Match(
        home_team_id=home_team.id,
        away_team_id=away_team.id,
        kickoff=datetime.utcnow() - timedelta(days=1),
        status="finished",
        home_goals=3,
        away_goals=0,
    )
    scheduled_match = Match(
        home_team_id=home_team.id,
        away_team_id=away_team.id,
        kickoff=datetime.utcnow() + timedelta(days=1),
        status="scheduled",
    )
    db_session.add_all([live_match, finished_match, scheduled_match])
    db_session.commit()

    live_response = client.get("/matches", params={"status": "live", "limit": 200})
    completed_response = client.get(
        "/matches", params={"status": "completed", "limit": 200}
    )
    upcoming_response = client.get("/matches", params={"limit": 200})

    assert live_response.status_code == 200
    live_payload = next(
        item for item in live_response.json() if item["id"] == live_match.id
    )
    assert live_payload["home_goals"] == 2
    assert live_payload["away_goals"] == 1

    completed_payload = next(
        item for item in completed_response.json() if item["id"] == finished_match.id
    )
    assert completed_payload["home_goals"] == 3
    assert completed_payload["away_goals"] == 0

    upcoming_payload = next(
        item for item in upcoming_response.json() if item["id"] == scheduled_match.id
    )
    assert upcoming_payload["home_goals"] is None
    assert upcoming_payload["away_goals"] is None


def test_get_match_returns_404_for_unknown_id(client: TestClient) -> None:
    response = client.get("/matches/999999")

    assert response.status_code == 404
    assert response.json()["detail"] == "Match not found"


def test_get_match_rejects_non_integer_id(client: TestClient) -> None:
    response = client.get("/matches/not-a-number")

    assert response.status_code == 422


@pytest.mark.parametrize(
    "params",
    [
        {"limit": 0},
        {"limit": 201},
        {"offset": -1},
    ],
)
def test_list_matches_rejects_invalid_pagination(
    client: TestClient,
    params: dict[str, int],
) -> None:
    response = client.get("/matches", params=params)

    assert response.status_code == 422


def test_list_matches_applies_limit_and_offset(
    client: TestClient,
    db_session: Session,
) -> None:
    home_team = Team(name="Pagination Home", logo_url=None)
    away_team = Team(name="Pagination Away", logo_url=None)
    db_session.add_all([home_team, away_team])
    db_session.flush()

    base = datetime.utcnow() + timedelta(days=1)
    matches = [
        Match(
            home_team_id=home_team.id,
            away_team_id=away_team.id,
            kickoff=base + timedelta(days=offset),
            status="scheduled",
        )
        for offset in range(3)
    ]
    db_session.add_all(matches)
    db_session.commit()
    ordered_ids = [match.id for match in matches]

    first_page = client.get("/matches", params={"limit": 2})
    second_page = client.get("/matches", params={"limit": 2, "offset": 2})

    assert first_page.status_code == 200
    assert second_page.status_code == 200
    assert [item["id"] for item in first_page.json()] == ordered_ids[:2]
    assert [item["id"] for item in second_page.json()] == ordered_ids[2:]


def test_list_matches_returns_enriched_prediction_and_odds_fields(
    client: TestClient,
    db_session: Session,
) -> None:
    competition = Competition(name="Premier League", country="England")
    home_team = Team(name="Form Home", logo_url=None)
    away_team = Team(name="Form Away", logo_url=None)
    db_session.add_all([competition, home_team, away_team])
    db_session.flush()

    form_kickoff = datetime.utcnow() - timedelta(days=10)
    db_session.add(
        Match(
            competition_id=competition.id,
            home_team_id=home_team.id,
            away_team_id=away_team.id,
            kickoff=form_kickoff,
            status="finished",
            home_goals=2,
            away_goals=1,
        )
    )

    upcoming_kickoff = datetime.utcnow() + timedelta(days=1)
    upcoming_match = Match(
        competition_id=competition.id,
        home_team_id=home_team.id,
        away_team_id=away_team.id,
        kickoff=upcoming_kickoff,
        status="scheduled",
    )
    db_session.add(upcoming_match)
    db_session.flush()

    db_session.add_all(
        [
            Prediction(
                match_id=upcoming_match.id,
                prob_home=0.6,
                prob_draw=0.25,
                prob_away=0.15,
            ),
            Odds(
                match_id=upcoming_match.id,
                bookmaker="Demo",
                home=2.1,
                draw=3.4,
                away=4.2,
                previous_home=2.0,
                previous_draw=3.5,
                previous_away=4.0,
            ),
        ]
    )
    db_session.commit()

    response = client.get("/matches")

    assert response.status_code == 200
    payload = next(item for item in response.json() if item["id"] == upcoming_match.id)
    assert payload["home_team"]["form"] == ["W"]
    assert payload["prediction"]["recommended_outcome"] == "home"
    assert payload["prediction"]["confidence"] == 0.6
    assert payload["prediction"]["insights"]
    assert payload["odds"][0]["home_movement"] == "up"
    assert payload["odds"][0]["draw_movement"] == "down"
    assert payload["odds"][0]["previous_home"] == 2.0


def test_list_matches_filters_by_status_completed(
    client: TestClient,
    db_session: Session,
) -> None:
    competition = Competition(name="Eredivisie", country="Netherlands")
    home_team = Team(name="Ajax", logo_url=None)
    away_team = Team(name="PSV", logo_url=None)
    db_session.add_all([competition, home_team, away_team])
    db_session.flush()

    completed_match = Match(
        competition_id=competition.id,
        home_team_id=home_team.id,
        away_team_id=away_team.id,
        kickoff=datetime.utcnow() - timedelta(days=2),
        status="finished",
        home_goals=1,
        away_goals=0,
    )
    upcoming_match = Match(
        competition_id=competition.id,
        home_team_id=home_team.id,
        away_team_id=away_team.id,
        kickoff=datetime.utcnow() + timedelta(days=1),
        status="scheduled",
    )
    db_session.add_all([completed_match, upcoming_match])
    db_session.commit()

    response = client.get("/matches", params={"status": "completed", "limit": 200})

    assert response.status_code == 200
    match_ids = {item["id"] for item in response.json()}
    assert completed_match.id in match_ids
    assert upcoming_match.id not in match_ids


def test_list_matches_completed_returns_most_recent_first(
    client: TestClient,
    db_session: Session,
) -> None:
    home_team = Team(name="Recent Home", logo_url=None)
    away_team = Team(name="Recent Away", logo_url=None)
    db_session.add_all([home_team, away_team])
    db_session.flush()

    oldest = Match(
        home_team_id=home_team.id,
        away_team_id=away_team.id,
        kickoff=datetime.utcnow() - timedelta(days=10),
        status="finished",
        home_goals=1,
        away_goals=0,
    )
    middle = Match(
        home_team_id=home_team.id,
        away_team_id=away_team.id,
        kickoff=datetime.utcnow() - timedelta(days=5),
        status="finished",
        home_goals=2,
        away_goals=1,
    )
    newest = Match(
        home_team_id=home_team.id,
        away_team_id=away_team.id,
        kickoff=datetime.utcnow() - timedelta(days=1),
        status="finished",
        home_goals=3,
        away_goals=2,
    )
    db_session.add_all([oldest, middle, newest])
    db_session.commit()

    response = client.get("/matches", params={"status": "completed", "limit": 2})

    assert response.status_code == 200
    assert [item["id"] for item in response.json()] == [newest.id, middle.id]


def test_list_matches_filters_by_search_query(
    client: TestClient,
    db_session: Session,
) -> None:
    competition = Competition(name="Premier League", country="England")
    other_competition = Competition(name="Bundesliga", country="Germany")
    home_team = Team(name="Paris", logo_url=None)
    away_team = Team(name="Lyon", logo_url=None)
    other_home = Team(name="Marseille", logo_url=None)
    other_away = Team(name="Nice", logo_url=None)
    db_session.add_all(
        [competition, other_competition, home_team, away_team, other_home, other_away]
    )
    db_session.flush()

    target_match = Match(
        competition_id=competition.id,
        home_team_id=home_team.id,
        away_team_id=away_team.id,
        kickoff=datetime.utcnow() + timedelta(days=1),
        status="scheduled",
    )
    other_match = Match(
        competition_id=other_competition.id,
        home_team_id=other_home.id,
        away_team_id=other_away.id,
        kickoff=datetime.utcnow() + timedelta(days=2),
        status="scheduled",
    )
    db_session.add_all([target_match, other_match])
    db_session.commit()

    response = client.get("/matches", params={"q": "paris", "limit": 200})

    assert response.status_code == 200
    match_ids = {item["id"] for item in response.json()}
    assert target_match.id in match_ids
    assert other_match.id not in match_ids


def test_list_matches_filters_by_odds_tier(
    client: TestClient,
    db_session: Session,
) -> None:
    competition = Competition(name="MLS", country="USA")
    home_team = Team(name="Low Odds Home", logo_url=None)
    away_team = Team(name="Low Odds Away", logo_url=None)
    db_session.add_all([competition, home_team, away_team])
    db_session.flush()

    low_odds_match = Match(
        competition_id=competition.id,
        home_team_id=home_team.id,
        away_team_id=away_team.id,
        kickoff=datetime.utcnow() + timedelta(days=1),
        status="scheduled",
    )
    high_odds_match = Match(
        competition_id=competition.id,
        home_team_id=home_team.id,
        away_team_id=away_team.id,
        kickoff=datetime.utcnow() + timedelta(days=2),
        status="scheduled",
    )
    db_session.add_all([low_odds_match, high_odds_match])
    db_session.flush()

    db_session.add_all(
        [
            Prediction(
                match_id=low_odds_match.id,
                prob_home=0.7,
                prob_draw=0.2,
                prob_away=0.1,
            ),
            Odds(
                match_id=low_odds_match.id,
                bookmaker="Demo",
                home=1.8,
                draw=3.4,
                away=5.0,
            ),
            Prediction(
                match_id=high_odds_match.id,
                prob_home=0.7,
                prob_draw=0.2,
                prob_away=0.1,
            ),
            Odds(
                match_id=high_odds_match.id,
                bookmaker="Demo",
                home=4.0,
                draw=3.4,
                away=5.0,
            ),
        ]
    )
    db_session.commit()

    response = client.get("/matches", params={"odds_tier": "low", "limit": 200})

    assert response.status_code == 200
    match_ids = {item["id"] for item in response.json()}
    assert low_odds_match.id in match_ids
    assert high_odds_match.id not in match_ids


def test_get_match_returns_enriched_fields(
    client: TestClient,
    db_session: Session,
) -> None:
    competition = Competition(name="Primeira Liga", country="Portugal")
    home_team = Team(name="Porto", logo_url=None)
    away_team = Team(name="Benfica", logo_url=None)
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
                prob_home=0.45,
                prob_draw=0.30,
                prob_away=0.25,
            ),
            Odds(
                match_id=match.id,
                bookmaker="Demo",
                home=2.0,
                draw=3.2,
                away=3.8,
                previous_home=2.2,
            ),
        ]
    )
    db_session.commit()

    response = client.get(f"/matches/{match.id}")

    assert response.status_code == 200
    payload = response.json()
    assert payload["prediction"]["recommended_outcome"] == "home"
    assert payload["prediction"]["confidence"] == 0.45
    assert payload["odds"][0]["home_movement"] == "down"
    assert payload["odds"][0]["previous_home"] == 2.2
