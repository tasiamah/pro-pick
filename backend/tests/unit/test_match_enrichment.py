from __future__ import annotations

from datetime import datetime

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.core.database import Base
from app.models import Competition, Match, Odds, Prediction, Team
from app.services.match_enrichment import (
    capture_previous_odds,
    classify_odds_tier,
    derive_odds_movement,
    matches_odds_tier_filter,
    matches_search_filter,
    matches_status_filter,
    prediction_confidence,
    recommended_outcome,
)

pytestmark = pytest.mark.unit


@pytest.fixture
def db_session() -> Session:
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    session = sessionmaker(bind=engine)()
    try:
        yield session
    finally:
        session.close()


def test_classify_odds_tier_matches_mobile_thresholds() -> None:
    assert classify_odds_tier(1.75) == "low"
    assert classify_odds_tier(2.5) == "medium"
    assert classify_odds_tier(4.0) == "high"
    assert classify_odds_tier(0) is None


@pytest.mark.parametrize(
    ("previous", "current", "expected"),
    [
        (2.0, 2.2, "up"),
        (2.0, 1.8, "down"),
        (2.0, 2.0005, "flat"),
        (None, 2.0, None),
    ],
)
def test_derive_odds_movement(previous, current, expected) -> None:
    assert derive_odds_movement(previous, current) == expected


def test_recommended_outcome_and_confidence() -> None:
    prediction = Prediction(
        match_id=1,
        prob_home=0.55,
        prob_draw=0.25,
        prob_away=0.20,
    )

    assert recommended_outcome(prediction) == "home"
    assert prediction_confidence(prediction) == pytest.approx(0.55)


def test_capture_previous_odds_updates_snapshot() -> None:
    odds = Odds(
        match_id=1,
        bookmaker="Demo",
        home=2.0,
        draw=3.0,
        away=4.0,
    )

    capture_previous_odds(odds, 2.1, 3.1, 4.1)

    assert odds.previous_home == 2.0
    assert odds.previous_draw == 3.0
    assert odds.previous_away == 4.0
    assert odds.home == 2.1
    assert odds.draw == 3.1
    assert odds.away == 4.1


def test_capture_previous_odds_skips_unchanged_values() -> None:
    odds = Odds(
        match_id=1,
        bookmaker="Demo",
        home=2.0,
        draw=3.0,
        away=4.0,
        previous_home=1.9,
        previous_draw=2.9,
        previous_away=3.9,
    )

    capture_previous_odds(odds, 2.0, 3.0, 4.0)

    assert odds.previous_home == 1.9
    assert odds.previous_draw == 2.9
    assert odds.previous_away == 3.9


def test_matches_status_filter(db_session: Session) -> None:
    home_team = Team(name="Home", logo_url=None)
    away_team = Team(name="Away", logo_url=None)
    db_session.add_all([home_team, away_team])
    db_session.flush()

    match = Match(
        home_team_id=home_team.id,
        away_team_id=away_team.id,
        kickoff=datetime.utcnow(),
        status="finished",
    )
    db_session.add(match)
    db_session.commit()

    assert matches_status_filter(match, "completed") is True
    assert matches_status_filter(match, "upcoming") is False


def test_matches_search_filter(db_session: Session) -> None:
    competition = Competition(name="Premier League", country="England")
    home_team = Team(name="Arsenal", logo_url=None)
    away_team = Team(name="Chelsea", logo_url=None)
    db_session.add_all([competition, home_team, away_team])
    db_session.flush()

    match = Match(
        competition_id=competition.id,
        home_team_id=home_team.id,
        away_team_id=away_team.id,
        kickoff=datetime.utcnow(),
        status="scheduled",
    )
    db_session.add(match)
    db_session.commit()

    assert matches_search_filter(match, "arsenal") is True
    assert matches_search_filter(match, "premier") is True
    assert matches_search_filter(match, "liverpool") is False


def test_matches_odds_tier_filter(db_session: Session) -> None:
    home_team = Team(name="Home", logo_url=None)
    away_team = Team(name="Away", logo_url=None)
    db_session.add_all([home_team, away_team])
    db_session.flush()

    match = Match(
        home_team_id=home_team.id,
        away_team_id=away_team.id,
        kickoff=datetime.utcnow(),
        status="scheduled",
    )
    db_session.add(match)
    db_session.flush()

    prediction = Prediction(
        match_id=match.id,
        prob_home=0.6,
        prob_draw=0.2,
        prob_away=0.2,
    )
    odds = Odds(
        match_id=match.id,
        bookmaker="Demo",
        home=1.8,
        draw=3.4,
        away=4.5,
    )
    db_session.add_all([prediction, odds])
    db_session.commit()

    assert matches_odds_tier_filter(match, "low", prediction, odds) is True
    assert matches_odds_tier_filter(match, "high", prediction, odds) is False
    assert matches_odds_tier_filter(match, "all", prediction, odds) is True
