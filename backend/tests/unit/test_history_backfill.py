from __future__ import annotations

from datetime import datetime, timedelta

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.core.database import Base
from app.models import Match, Team
from app.services.history_backfill import (
    backfill_missing_team_history,
    teams_needing_history,
)

pytestmark = pytest.mark.unit

NOW = datetime(2026, 1, 1, 12, 0)


@pytest.fixture
def db_session() -> Session:
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    session = sessionmaker(bind=engine)()
    try:
        yield session
    finally:
        session.close()


def _team(db: Session, external_id: int) -> Team:
    team = Team(external_id=external_id, name=f"Team {external_id}", logo_url=None)
    db.add(team)
    db.flush()
    return team


def _match(
    db: Session,
    home: Team,
    away: Team,
    *,
    kickoff: datetime,
    status: str,
    home_goals: int | None = None,
    away_goals: int | None = None,
    external_id: int | None = None,
) -> Match:
    match = Match(
        external_id=external_id,
        home_team_id=home.id,
        away_team_id=away.id,
        kickoff=kickoff,
        status=status,
        home_goals=home_goals,
        away_goals=away_goals,
    )
    db.add(match)
    db.flush()
    return match


class StubClient:
    def __init__(self, team_fixtures: dict[int, list[dict]]) -> None:
        self.team_fixtures = team_fixtures
        self.calls: list[int] = []

    def get_team_fixtures(
        self, team_id: int, *, last: int | None = None, season: int | None = None
    ) -> list[dict]:
        self.calls.append(team_id)
        return self.team_fixtures.get(team_id, [])


def _finished_fixture(fixture_id: int, home_id: int, away_id: int) -> dict:
    return {
        "fixture": {
            "id": fixture_id,
            "date": "2025-11-01T18:00:00+00:00",
            "status": {"short": "FT"},
        },
        "league": {"id": 1, "name": "Friendlies", "country": "World", "season": 2025},
        "teams": {
            "home": {"id": home_id, "name": f"Team {home_id}", "logo": None},
            "away": {"id": away_id, "name": f"Team {away_id}", "logo": None},
        },
        "goals": {"home": 2, "away": 1},
    }


def test_teams_needing_history_flags_only_low_history_upcoming_teams(
    db_session: Session,
) -> None:
    poor = _team(db_session, 100)
    rich = _team(db_session, 200)
    opponent = _team(db_session, 300)

    # `rich` has 3 finished matches; `poor` has none.
    for idx in range(3):
        _match(
            db_session,
            rich,
            opponent,
            kickoff=NOW - timedelta(days=idx + 1),
            status="finished",
            home_goals=1,
            away_goals=0,
        )
    # Upcoming match pairs a poor-history team with a rich-history team.
    _match(db_session, poor, rich, kickoff=NOW + timedelta(days=1), status="scheduled")
    db_session.commit()

    needy = teams_needing_history(
        db_session, now=NOW, min_finished_matches=3, max_teams=10
    )

    assert [team.external_id for team in needy] == [100]


def test_teams_needing_history_orders_by_kickoff_and_caps(db_session: Session) -> None:
    a = _team(db_session, 100)
    b = _team(db_session, 200)
    c = _team(db_session, 300)

    _match(db_session, c, a, kickoff=NOW + timedelta(days=3), status="scheduled")
    _match(db_session, a, b, kickoff=NOW + timedelta(days=1), status="scheduled")
    db_session.commit()

    needy = teams_needing_history(
        db_session, now=NOW, min_finished_matches=5, max_teams=2
    )

    # Soonest match first (a, b), capped at 2 — c is dropped despite needing history.
    assert [team.external_id for team in needy] == [100, 200]


def test_backfill_missing_team_history_imports_for_needy_teams(
    db_session: Session,
) -> None:
    poor = _team(db_session, 100)
    other = _team(db_session, 400)
    filler = _team(db_session, 700)
    # `other` already has enough history, so only `poor` should be backfilled.
    for idx in range(5):
        _match(
            db_session,
            other,
            filler,
            kickoff=NOW - timedelta(days=idx + 1),
            status="finished",
            home_goals=1,
            away_goals=0,
        )
    _match(db_session, poor, other, kickoff=NOW + timedelta(days=1), status="scheduled")
    db_session.commit()

    client = StubClient(
        team_fixtures={
            100: [
                _finished_fixture(9001, 100, 500),
                _finished_fixture(9002, 600, 100),
            ]
        }
    )

    summary = backfill_missing_team_history(
        db_session,
        client=client,
        now=NOW,
        min_finished_matches=5,
        last=40,
        max_teams=10,
    )

    assert client.calls == [100]
    assert summary.matches == 2
    imported = {
        match.external_id
        for match in db_session.query(Match).filter(Match.external_id.isnot(None))
    }
    assert {9001, 9002} <= imported


def test_backfill_missing_team_history_noop_when_all_have_history(
    db_session: Session,
) -> None:
    a = _team(db_session, 100)
    b = _team(db_session, 200)
    for idx in range(6):
        _match(
            db_session,
            a,
            b,
            kickoff=NOW - timedelta(days=idx + 1),
            status="finished",
            home_goals=1,
            away_goals=1,
        )
    _match(db_session, a, b, kickoff=NOW + timedelta(days=1), status="scheduled")
    db_session.commit()

    client = StubClient(team_fixtures={})
    summary = backfill_missing_team_history(
        db_session, client=client, now=NOW, min_finished_matches=5, max_teams=10
    )

    assert client.calls == []
    assert summary.matches == 0
