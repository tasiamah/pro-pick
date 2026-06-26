from __future__ import annotations

from datetime import UTC, datetime

import pytest
from sqlalchemy.orm import Session

from app.core.database import SessionLocal
from app.models import Match, Team, ValueBet
from app.services.live_sync import settle_value_bets

pytestmark = pytest.mark.integration


@pytest.fixture
def db_session() -> Session:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def _make_match(
    db: Session,
    *,
    home_goals: int | None,
    away_goals: int | None,
    status: str | None = None,
) -> Match:
    home = Team(name="Settle Home", logo_url=None)
    away = Team(name="Settle Away", logo_url=None)
    db.add_all([home, away])
    db.flush()

    if status is None:
        status = "finished" if home_goals is not None else "scheduled"
    match = Match(
        home_team_id=home.id,
        away_team_id=away.id,
        kickoff=datetime(2026, 6, 1, 15, 0, tzinfo=UTC),
        status=status,
        home_goals=home_goals,
        away_goals=away_goals,
    )
    db.add(match)
    db.flush()
    return match


def _make_bet(
    db: Session, match: Match, outcome: str, odd: float, stake: float
) -> ValueBet:
    bet = ValueBet(
        match_id=match.id,
        outcome=outcome,
        model_prob=0.5,
        odd=odd,
        expected_value=0.1,
        edge=0.1,
        recommended_stake=stake,
    )
    db.add(bet)
    db.flush()
    return bet


def test_settlement_records_profit_for_finished_matches(db_session: Session) -> None:
    match = _make_match(db_session, home_goals=2, away_goals=1)
    winner = _make_bet(db_session, match, "home", odd=2.0, stake=10.0)
    loser = _make_bet(db_session, match, "away", odd=4.0, stake=5.0)
    no_stake_winner = _make_bet(db_session, match, "home", odd=3.0, stake=0.0)
    db_session.commit()

    settled = settle_value_bets(db_session)

    assert settled == 3
    assert (winner.settled, winner.profit) == (True, 10.0)
    assert (loser.settled, loser.profit) == (True, -5.0)
    assert (no_stake_winner.settled, no_stake_winner.profit) == (True, 2.0)


def test_settlement_skips_unfinished_matches_and_is_idempotent(
    db_session: Session,
) -> None:
    unfinished = _make_match(db_session, home_goals=None, away_goals=None)
    pending_bet = _make_bet(db_session, unfinished, "home", odd=2.0, stake=10.0)
    finished = _make_match(db_session, home_goals=0, away_goals=2)
    settled_bet = _make_bet(db_session, finished, "away", odd=2.5, stake=10.0)
    db_session.commit()

    first = settle_value_bets(db_session)
    second = settle_value_bets(db_session)

    assert (first, second) == (1, 0)
    assert pending_bet.settled is False
    assert pending_bet.profit is None
    assert (settled_bet.settled, settled_bet.profit) == (True, 15.0)


def test_settlement_ignores_live_matches_with_intermediate_scores(
    db_session: Session,
) -> None:
    live = _make_match(db_session, home_goals=1, away_goals=0, status="live")
    bet = _make_bet(db_session, live, "home", odd=2.0, stake=10.0)
    db_session.commit()

    settled = settle_value_bets(db_session)

    assert settled == 0
    assert bet.settled is False
    assert bet.profit is None
