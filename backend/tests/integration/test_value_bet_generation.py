"""Integration tests: value-bet persistence (PP-63)."""

from __future__ import annotations

from collections.abc import Iterator
from datetime import datetime

import pytest
from sqlalchemy.orm import Session

from app.core.database import SessionLocal
from app.models import Match, Odds, Prediction, Team, ValueBet
from app.services.prediction import value_bet_probabilities
from app.services.value_bets import generate_value_bets

pytestmark = pytest.mark.integration

BASE = datetime(2026, 6, 27, 15, 0)


@pytest.fixture
def db_session() -> Iterator[Session]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def _seed_match(db: Session) -> Match:
    home = Team(name="VB Home", logo_url=None)
    away = Team(name="VB Away", logo_url=None)
    db.add_all([home, away])
    db.flush()

    match = Match(
        home_team_id=home.id,
        away_team_id=away.id,
        kickoff=BASE,
        status="scheduled",
    )
    db.add(match)
    db.flush()

    db.add(
        Prediction(
            match_id=match.id,
            model_version="test-v1",
            prob_home=0.55,
            prob_draw=0.25,
            prob_away=0.20,
        )
    )
    db.add(Odds(match_id=match.id, bookmaker="Bet365", home=2.10, draw=3.40, away=4.50))
    db.commit()
    return match


def test_generate_value_bets_persists_ev_edge_stake_confidence(
    db_session: Session,
) -> None:
    match = _seed_match(db_session)

    created = generate_value_bets(db_session, match)
    db_session.commit()

    probs = value_bet_probabilities(db_session, match)
    assert probs is not None
    assert created
    stored = db_session.query(ValueBet).filter(ValueBet.match_id == match.id).all()
    assert {bet.outcome for bet in stored} == {"home"}

    bet = stored[0]
    assert bet.expected_value == pytest.approx(probs["home"] * 2.10 - 1.0, abs=1e-4)
    assert bet.edge == pytest.approx(probs["home"] - 1.0 / 2.10, abs=1e-4)
    assert 0.0 < bet.recommended_stake <= 1.0
    assert bet.confidence == pytest.approx(probs["home"] - probs["draw"], abs=1e-4)


def test_generate_value_bets_uses_best_price_per_outcome_across_books(
    db_session: Session,
) -> None:
    match = _seed_match(db_session)
    db_session.add(
        Odds(match_id=match.id, bookmaker="Softer", home=2.25, draw=3.60, away=5.00)
    )
    db_session.commit()

    created = generate_value_bets(db_session, match)
    db_session.commit()

    probs = value_bet_probabilities(db_session, match)
    assert probs is not None
    assert created
    bet = created[0]
    assert bet.outcome == "home"
    assert bet.odd == pytest.approx(2.25)
    assert bet.edge == pytest.approx(probs["home"] - 1.0 / 2.25, abs=1e-4)


def test_generate_value_bets_replaces_unsettled_but_keeps_settled(
    db_session: Session,
) -> None:
    match = _seed_match(db_session)
    db_session.add_all(
        [
            ValueBet(
                match_id=match.id,
                outcome="away",
                model_prob=0.5,
                odd=2.0,
                expected_value=0.0,
                edge=0.0,
                settled=False,
            ),
            ValueBet(
                match_id=match.id,
                outcome="draw",
                model_prob=0.5,
                odd=2.0,
                expected_value=0.0,
                edge=0.0,
                settled=True,
                profit=1.0,
            ),
        ]
    )
    db_session.commit()

    generate_value_bets(db_session, match)
    db_session.commit()

    bets = db_session.query(ValueBet).filter(ValueBet.match_id == match.id).all()
    settled = [bet for bet in bets if bet.settled]
    unsettled = [bet for bet in bets if not bet.settled]
    assert len(settled) == 1
    assert settled[0].profit == 1.0
    assert [bet.outcome for bet in unsettled] == ["home"]


def test_generate_value_bets_returns_empty_without_prediction_or_odds(
    db_session: Session,
) -> None:
    home = Team(name="VB Home", logo_url=None)
    away = Team(name="VB Away", logo_url=None)
    db_session.add_all([home, away])
    db_session.flush()
    match = Match(
        home_team_id=home.id,
        away_team_id=away.id,
        kickoff=BASE,
        status="scheduled",
    )
    db_session.add(match)
    db_session.commit()

    assert generate_value_bets(db_session, match) == []
