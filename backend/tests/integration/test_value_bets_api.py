from __future__ import annotations

from datetime import datetime, timezone
from typing import NamedTuple

import pytest
from fastapi.testclient import TestClient

from app.core.database import Base, SessionLocal, engine, init_db
from app.main import app
from app.models import Match, Team, ValueBet

pytestmark = pytest.mark.integration


class ValueBetFixture(NamedTuple):
    client: TestClient
    match_one_id: int
    match_two_id: int


@pytest.fixture()
def value_bets_api() -> ValueBetFixture:
    init_db()
    db = SessionLocal()
    try:
        home = Team(name="Home FC")
        away = Team(name="Away FC")
        db.add_all([home, away])
        db.flush()

        match_one = Match(
            home_team_id=home.id,
            away_team_id=away.id,
            kickoff=datetime(2026, 6, 24, 15, 0, tzinfo=timezone.utc),
            status="scheduled",
        )
        match_two = Match(
            home_team_id=home.id,
            away_team_id=away.id,
            kickoff=datetime(2026, 6, 25, 15, 0, tzinfo=timezone.utc),
            status="scheduled",
        )
        db.add_all([match_one, match_two])
        db.flush()

        db.add_all(
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
        db.commit()
        match_one_id = match_one.id
        match_two_id = match_two.id
    finally:
        db.close()

    with TestClient(app) as test_client:
        yield ValueBetFixture(test_client, match_one_id, match_two_id)

    Base.metadata.drop_all(bind=engine)


def test_list_value_bets_returns_all_sorted_by_edge(
    value_bets_api: ValueBetFixture,
) -> None:
    response = value_bets_api.client.get("/value-bets")

    assert response.status_code == 200
    payload = response.json()
    assert len(payload) == 3
    assert [bet["edge"] for bet in payload] == [0.15, 0.1, 0.05]


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
