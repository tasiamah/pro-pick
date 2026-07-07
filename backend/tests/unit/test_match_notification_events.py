"""Unit tests for match notification event mapping."""

from __future__ import annotations

from datetime import UTC, datetime
from types import SimpleNamespace

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.core.database import Base
from app.models import Match, Team
from app.services.match_notification_events import (
    _events_from_fixture_event,
    _events_from_status_transition,
    run_live_notification_sync,
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


def _match() -> SimpleNamespace:
    return SimpleNamespace(
        id=1,
        home_team=SimpleNamespace(name="Bologna"),
        away_team=SimpleNamespace(name="Empoli"),
        home_goals=1,
        away_goals=0,
    )


def test_status_transition_match_start() -> None:
    events = _events_from_status_transition(
        _match(),
        previous_status="scheduled",
        previous_short="NS",
        new_status="live",
        new_short="1H",
    )
    assert any(event.event_type == "match_start" for event in events)


def test_status_transition_match_end() -> None:
    events = _events_from_status_transition(
        _match(),
        previous_status="live",
        previous_short="2H",
        new_status="finished",
        new_short="FT",
    )
    assert any(event.event_type == "match_end" for event in events)


def test_fixture_goal_event_maps_goal_and_scorer() -> None:
    events = _events_from_fixture_event(
        _match(),
        {
            "type": "Goal",
            "detail": "Normal Goal",
            "time": {"elapsed": 12},
            "team": {"name": "Bologna"},
            "player": {"name": "Player A"},
            "assist": {"name": "Player B"},
        },
    )
    event_types = {event.event_type for event in events}
    assert "goal" in event_types
    assert "goalscorer" in event_types
    assert "assist" in event_types


def test_fixture_red_card_event() -> None:
    events = _events_from_fixture_event(
        _match(),
        {
            "type": "Card",
            "detail": "Red Card",
            "time": {"elapsed": 55},
            "team": {"name": "Empoli"},
            "player": {"name": "Player C"},
        },
    )
    assert events[0].event_type == "red_card"


class _RecordingClient:
    def __init__(self) -> None:
        self.requested_ids: list[list[int]] = []
        self.lineup_calls: list[int] = []
        self.event_calls: list[int] = []

    def get_fixtures_by_ids(self, fixture_ids: list[int]) -> list[dict]:
        self.requested_ids.append(list(fixture_ids))
        return []

    def get_fixture_lineups(self, fixture_id: int) -> list[dict]:
        self.lineup_calls.append(fixture_id)
        return []

    def get_fixture_events(self, fixture_id: int) -> list[dict]:
        self.event_calls.append(fixture_id)
        return []


def _seed_match(
    db: Session,
    *,
    external_id: int,
    kickoff: datetime,
    status: str = "scheduled",
) -> Match:
    home = Team(name=f"Home {external_id}")
    away = Team(name=f"Away {external_id}")
    db.add_all([home, away])
    db.flush()
    match = Match(
        external_id=external_id,
        home_team_id=home.id,
        away_team_id=away.id,
        kickoff=kickoff,
        status=status,
    )
    db.add(match)
    db.commit()
    return match


def test_live_poll_ignores_far_future_scheduled_matches(
    db_session: Session,
) -> None:
    now = datetime(2026, 6, 26, 12, 0, tzinfo=UTC)
    # Imminent kickoff — should be polled (line-ups checked).
    _seed_match(db_session, external_id=101, kickoff=datetime(2026, 6, 26, 13, 0))
    # Weeks away — must NOT be polled at all (this is the quota killer).
    _seed_match(db_session, external_id=999, kickoff=datetime(2026, 7, 20, 15, 0))

    client = _RecordingClient()
    run_live_notification_sync(db_session, client=client, now=now)

    # Only the imminent match is fetched / line-up-checked; the far one is skipped.
    assert client.requested_ids == [[101]]
    assert client.lineup_calls == [101]
    assert 999 not in client.lineup_calls


def test_live_poll_includes_live_match_even_with_old_kickoff(
    db_session: Session,
) -> None:
    now = datetime(2026, 6, 26, 12, 0, tzinfo=UTC)
    # Kicked off 11h ago (outside the lookback window) but still marked live —
    # a live match must always be polled regardless of kickoff age.
    _seed_match(
        db_session,
        external_id=202,
        kickoff=datetime(2026, 6, 26, 1, 0),
        status="live",
    )

    client = _RecordingClient()
    run_live_notification_sync(db_session, client=client, now=now)

    assert client.requested_ids == [[202]]
    assert client.event_calls == [202]
