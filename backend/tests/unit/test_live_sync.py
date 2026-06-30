from __future__ import annotations

from datetime import UTC, date, datetime

import httpx
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.core.database import Base
from app.models import Match, Odds, Prediction, Team, ValueBet
from app.services.data_ingestion import FootballApiClient
from app.services.ingestion_alerts import IngestionPipelineError
from app.services.live_sync import (
    fetch_fixtures_for_window,
    run_live_sync,
)

pytestmark = pytest.mark.unit


def _fixture_item(
    fixture_id: int,
    league_id: int,
    home_name: str = "Home",
    away_name: str = "Away",
    kickoff: str = "2026-06-26T15:00:00+00:00",
) -> dict:
    return {
        "fixture": {"id": fixture_id, "date": kickoff, "status": {"short": "NS"}},
        "league": {"id": league_id, "name": "League", "country": "X", "season": 2025},
        "teams": {
            "home": {"id": fixture_id * 10, "name": home_name},
            "away": {"id": fixture_id * 10 + 1, "name": away_name},
        },
        "goals": {"home": None, "away": None},
    }


@pytest.fixture
def db_session() -> Session:
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    session = sessionmaker(bind=engine)()
    try:
        yield session
    finally:
        session.close()


def test_get_fixtures_by_date_returns_provider_response() -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        assert request.url.path == "/fixtures"
        assert request.url.params["date"] == "2026-06-26"
        return httpx.Response(
            200,
            json={"response": [{"fixture": {"id": 1001}}], "errors": []},
        )

    client = FootballApiClient(
        api_key="test-key",
        min_request_interval_seconds=0,
        transport=httpx.MockTransport(handler),
    )

    fixtures = client.get_fixtures_by_date(date(2026, 6, 26))

    assert fixtures == [{"fixture": {"id": 1001}}]


def test_fetch_fixtures_for_window_filters_leagues_and_dates() -> None:
    calls: list[str] = []

    def handler(request: httpx.Request) -> httpx.Response:
        calls.append(request.url.params["date"])
        if request.url.params["date"] == "2026-06-26":
            payload = [
                _fixture_item(1, 39, "Arsenal", "Chelsea"),
                _fixture_item(2, 999, "A", "B", "2026-06-26T17:00:00+00:00"),
            ]
        else:
            payload = [
                _fixture_item(
                    3,
                    140,
                    "Barcelona",
                    "Madrid",
                    "2026-06-27T15:00:00+00:00",
                ),
            ]
        return httpx.Response(200, json={"response": payload, "errors": []})

    client = FootballApiClient(
        api_key="test-key",
        min_request_interval_seconds=0,
        transport=httpx.MockTransport(handler),
    )
    now = datetime(2026, 6, 26, 12, 0, tzinfo=UTC)

    result = fetch_fixtures_for_window(
        client,
        league_ids=(39, 140),
        date_offsets=(0, 1),
        now=now,
    )

    assert calls == ["2026-06-26", "2026-06-27"]
    assert len(result.fixtures) == 2
    assert {item["fixture"]["id"] for item in result.fixtures} == {1, 3}
    assert result.dates_attempted == 2
    assert result.dates_failed == 0


def test_run_live_sync_raises_when_all_fixture_dates_fail(
    db_session: Session,
) -> None:
    class FailingClient:
        def get_fixtures_by_date(self, _match_date: date) -> list[dict]:
            raise httpx.TransportError("network down")

    with pytest.raises(
        IngestionPipelineError,
        match="All 1 fixture date fetches failed",
    ):
        run_live_sync(
            db_session,
            league_ids=(39,),
            date_offsets=(0,),
            client=FailingClient(),
            now=datetime(2026, 6, 26, 12, 0, tzinfo=UTC),
        )


def test_run_live_sync_persists_upcoming_match_prediction_and_value_bet(
    db_session: Session,
) -> None:
    fixture = {
        "fixture": {
            "id": 5001,
            "date": "2026-06-27T15:00:00+00:00",
            "status": {"short": "NS"},
        },
        "league": {
            "id": 39,
            "name": "Premier League",
            "country": "England",
            "season": 2025,
        },
        "teams": {
            "home": {"id": 33, "name": "Arsenal", "logo": None},
            "away": {"id": 34, "name": "Chelsea", "logo": None},
        },
        "goals": {"home": None, "away": None},
    }

    class StubClient:
        def get_fixtures_by_date(self, _match_date: date) -> list[dict]:
            return [fixture]

        def get_odds(self, fixture_id: int) -> list[dict]:
            assert fixture_id == 5001
            return [
                {
                    "bookmakers": [
                        {
                            "name": "Bet365",
                            "bets": [
                                {
                                    "name": "Match Winner",
                                    "values": [
                                        {"value": "Home", "odd": "3.20"},
                                        {"value": "Draw", "odd": "3.40"},
                                        {"value": "Away", "odd": "2.90"},
                                    ],
                                }
                            ],
                        }
                    ]
                }
            ]

    summary = run_live_sync(
        db_session,
        league_ids=(39,),
        date_offsets=(0,),
        import_odds=True,
        client=StubClient(),
        now=datetime(2026, 6, 26, 12, 0, tzinfo=UTC),
    )

    assert summary.fixtures_fetched == 1
    assert summary.import_summary is not None
    assert summary.import_summary.matches == 1
    assert summary.import_summary.odds == 1
    assert summary.predictions == 1
    assert summary.value_bets >= 1

    match = db_session.query(Match).one()
    assert match.status == "scheduled"
    assert db_session.query(Prediction).count() == 1
    assert db_session.query(Odds).count() == 1
    assert db_session.query(ValueBet).count() >= 1


def test_run_live_sync_settles_finished_bets_when_no_fixtures(
    db_session: Session,
) -> None:
    home = Team(name="Arsenal")
    away = Team(name="Chelsea")
    db_session.add_all([home, away])
    db_session.flush()
    match = Match(
        home_team_id=home.id,
        away_team_id=away.id,
        kickoff=datetime(2026, 6, 25, 15, 0),
        status="finished",
        home_goals=2,
        away_goals=1,
    )
    db_session.add(match)
    db_session.flush()
    bet = ValueBet(
        match_id=match.id,
        outcome="home",
        model_prob=0.5,
        odd=2.0,
        expected_value=0.1,
        edge=0.1,
        recommended_stake=10.0,
    )
    db_session.add(bet)
    db_session.commit()

    class EmptyClient:
        def get_fixtures_by_date(self, _match_date: date) -> list[dict]:
            return []

    summary = run_live_sync(
        db_session,
        league_ids=(39,),
        date_offsets=(0,),
        client=EmptyClient(),
        now=datetime(2026, 6, 26, 12, 0, tzinfo=UTC),
    )

    assert summary.fixtures_fetched == 0
    assert summary.settled_value_bets == 1
    assert bet.settled is True
    assert bet.profit == 10.0
