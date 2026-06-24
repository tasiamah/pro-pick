from __future__ import annotations

from datetime import UTC, datetime
from typing import NamedTuple

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.core.database import SessionLocal
from app.main import app
from app.models import Match, Team, ValueBet

pytestmark = pytest.mark.integration


class ValueBetFixture(NamedTuple):
    client: TestClient
    match_one_id: int
    match_two_id: int


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


@pytest.fixture
def value_bets_api(client: TestClient, db_session: Session) -> ValueBetFixture:
    home = Team(name="Value Bet Home", logo_url=None)
    away = Team(name="Value Bet Away", logo_url=None)
    db_session.add_all([home, away])
    db_session.flush()

    match_one = Match(
        home_team_id=home.id,
        away_team_id=away.id,
        kickoff=datetime(2026, 6, 24, 15, 0, tzinfo=UTC),
        status="scheduled",
    )
    match_two = Match(
        home_team_id=home.id,
        away_team_id=away.id,
        kickoff=datetime(2026, 6, 25, 15, 0, tzinfo=UTC),
        status="scheduled",
    )
    db_session.add_all([match_one, match_two])
    db_session.flush()

    db_session.add_all(
        [
            ValueBet(
                match_id=match_one.id,
                outcome="home",
                model_prob=0.55,
                odd=2.1,
                expected_value=0.155,
                edge=0.1,
            ),
            ValueBet(
                match_id=match_one.id,
                outcome="away",
                model_prob=0.4,
                odd=3.0,
                expected_value=0.2,
                edge=0.15,
            ),
            ValueBet(
                match_id=match_two.id,
                outcome="home",
                model_prob=0.5,
                odd=2.0,
                expected_value=0.0,
                edge=0.05,
            ),
        ]
    )
    db_session.commit()

    return ValueBetFixture(client, match_one.id, match_two.id)


def test_list_value_bets_returns_all_sorted_by_edge(
    value_bets_api: ValueBetFixture,
) -> None:
    response = value_bets_api.client.get("/value-bets")

    assert response.status_code == 200
    payload = response.json()
    match_one_bets = [
        bet for bet in payload if bet["match_id"] == value_bets_api.match_one_id
    ]
    match_two_bets = [
        bet for bet in payload if bet["match_id"] == value_bets_api.match_two_id
    ]
    assert len(match_one_bets) == 2
    assert len(match_two_bets) == 1
    assert [bet["edge"] for bet in match_one_bets] == [0.15, 0.1]
    assert match_two_bets[0]["edge"] == 0.05


def test_list_value_bets_filters_by_match_id(
    value_bets_api: ValueBetFixture,
) -> None:
    response = value_bets_api.client.get(
        "/value-bets",
        params={"match_id": value_bets_api.match_one_id},
    )

    assert response.status_code == 200
    payload = response.json()
    assert len(payload) == 2
    assert all(bet["match_id"] == value_bets_api.match_one_id for bet in payload)
    assert [bet["edge"] for bet in payload] == [0.15, 0.1]

    other_match_response = value_bets_api.client.get(
        "/value-bets",
        params={"match_id": value_bets_api.match_two_id},
    )
    other_match_payload = other_match_response.json()
    assert len(other_match_payload) == 1
    assert other_match_payload[0]["match_id"] == value_bets_api.match_two_id
