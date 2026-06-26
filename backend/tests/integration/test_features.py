"""Integration tests for ML feature engineering against the database."""

from __future__ import annotations

from datetime import datetime, timedelta
from typing import NamedTuple

import pytest
from sqlalchemy.orm import Session

from app.core.database import SessionLocal
from app.ml.features import build_features, build_training_dataset
from app.models import Competition, Match, Team

pytestmark = pytest.mark.integration

BASE = datetime(2024, 3, 1, 15, 0)


class FeatureFixture(NamedTuple):
    home_id: int
    away_id: int
    target_id: int
    finished_ids: list[int]


@pytest.fixture
def db_session() -> Session:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@pytest.fixture
def seeded_matches(db_session: Session) -> FeatureFixture:
    competition = Competition(name="Feature League", country="Testland", season="2024")
    team_a = Team(name="Alpha", logo_url=None)
    team_b = Team(name="Beta", logo_url=None)
    team_c = Team(name="Gamma", logo_url=None)
    db_session.add_all([competition, team_a, team_b, team_c])
    db_session.flush()

    first = Match(
        competition_id=competition.id,
        home_team_id=team_a.id,
        away_team_id=team_b.id,
        kickoff=BASE + timedelta(days=1),
        status="finished",
        home_goals=2,
        away_goals=0,
    )
    second = Match(
        competition_id=competition.id,
        home_team_id=team_a.id,
        away_team_id=team_c.id,
        kickoff=BASE + timedelta(days=8),
        status="finished",
        home_goals=1,
        away_goals=1,
    )
    target = Match(
        competition_id=competition.id,
        home_team_id=team_b.id,
        away_team_id=team_a.id,
        kickoff=BASE + timedelta(days=15),
        status="scheduled",
    )
    db_session.add_all([first, second, target])
    db_session.commit()

    return FeatureFixture(
        home_id=team_b.id,
        away_id=team_a.id,
        target_id=target.id,
        finished_ids=[first.id, second.id],
    )


def test_build_features_uses_point_in_time_history(
    db_session: Session,
    seeded_matches: FeatureFixture,
) -> None:
    target = db_session.get(Match, seeded_matches.target_id)

    features = build_features(db_session, target)

    assert features["home_form_points"] == 0.0
    assert features["away_form_points"] == 2.0
    assert features["h2h_away_win_rate"] == 1.0
    assert features["away_table_points"] == 4.0
    assert features["home_rest_days"] == 14.0
    assert features["away_rest_days"] == 7.0


def test_build_training_dataset_is_labeled_and_reproducible(
    db_session: Session,
    seeded_matches: FeatureFixture,
) -> None:
    dataset = build_training_dataset(db_session)

    assert dataset.match_ids == seeded_matches.finished_ids
    assert dataset.labels == ["home", "draw"]
    assert dataset.features[0]["home_form_points"] == 0.0
    assert dataset.features[1]["home_form_points"] == 3.0

    again = build_training_dataset(db_session)
    assert again.match_ids == dataset.match_ids
    assert again.features == dataset.features
    assert again.labels == dataset.labels


def test_build_features_requires_a_kickoff(db_session: Session) -> None:
    match = Match(home_team_id=1, away_team_id=2, kickoff=None)

    with pytest.raises(ValueError):
        build_features(db_session, match)
