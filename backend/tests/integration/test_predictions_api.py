"""Integration tests for the predictions API."""

from __future__ import annotations

from datetime import UTC, datetime
from typing import NamedTuple

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.core.database import SessionLocal
from app.main import app
from app.models import Match, Prediction, Team

pytestmark = pytest.mark.integration


class PredictionFixture(NamedTuple):
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
def predictions_api(client: TestClient, db_session: Session) -> PredictionFixture:
    home = Team(name="Prediction Home", logo_url=None)
    away = Team(name="Prediction Away", logo_url=None)
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
            Prediction(
                match_id=match_one.id,
                prob_home=0.5,
                prob_draw=0.25,
                prob_away=0.25,
            ),
            Prediction(
                match_id=match_one.id,
                model_version="v2",
                prob_home=0.6,
                prob_draw=0.2,
                prob_away=0.2,
            ),
            Prediction(
                match_id=match_two.id,
                prob_home=0.5,
                prob_draw=0.3,
                prob_away=0.2,
            ),
        ]
    )
    db_session.commit()

    return PredictionFixture(client, match_one.id, match_two.id)


def test_list_predictions_returns_match_id_and_probabilities(
    predictions_api: PredictionFixture,
) -> None:
    response = predictions_api.client.get("/predictions")

    assert response.status_code == 200
    payload = response.json()
    match_one_predictions = [
        prediction
        for prediction in payload
        if prediction["match_id"] == predictions_api.match_one_id
    ]
    match_two_predictions = [
        prediction
        for prediction in payload
        if prediction["match_id"] == predictions_api.match_two_id
    ]
    assert len(match_one_predictions) == 2
    assert len(match_two_predictions) == 1
    sample = match_two_predictions[0]
    assert sample["model_version"] == "v1"
    assert sample["prob_home"] == 0.5
    assert sample["prob_draw"] == 0.3
    assert sample["prob_away"] == 0.2


def test_list_predictions_filters_by_match_id(
    predictions_api: PredictionFixture,
) -> None:
    response = predictions_api.client.get(
        "/predictions",
        params={"match_id": predictions_api.match_one_id},
    )

    assert response.status_code == 200
    payload = response.json()
    assert len(payload) == 2
    assert all(
        prediction["match_id"] == predictions_api.match_one_id for prediction in payload
    )

    other_match_response = predictions_api.client.get(
        "/predictions",
        params={"match_id": predictions_api.match_two_id},
    )
    other_match_payload = other_match_response.json()
    assert len(other_match_payload) == 1
    assert other_match_payload[0]["match_id"] == predictions_api.match_two_id


def test_list_predictions_respects_limit(
    predictions_api: PredictionFixture,
) -> None:
    response = predictions_api.client.get("/predictions", params={"limit": 1})

    assert response.status_code == 200
    assert len(response.json()) == 1


@pytest.mark.parametrize(
    "params",
    [
        {"limit": 0},
        {"limit": 201},
        {"match_id": 0},
    ],
)
def test_list_predictions_rejects_invalid_query_params(
    client: TestClient,
    params: dict[str, int],
) -> None:
    response = client.get("/predictions", params=params)

    assert response.status_code == 422
