from __future__ import annotations

from datetime import datetime

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.core.database import Base
from app.models import Competition, Match, Odds, Team
from app.services.data_ingestion import FootballApiError
from app.services.historical_import import (
    MAX_CONSECUTIVE_ODDS_FAILURES,
    HistoricalDataImporter,
    extract_match_winner_odds,
    map_fixture_status,
    parse_kickoff,
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


def sample_fixture(
    fixture_id: int = 1001,
    status: str = "FT",
    home_goals: int | None = 2,
    away_goals: int | None = 1,
) -> dict:
    return {
        "fixture": {
            "id": fixture_id,
            "date": "2024-08-16T19:00:00+00:00",
            "status": {"short": status},
        },
        "league": {
            "id": 39,
            "name": "Premier League",
            "country": "England",
            "season": 2024,
        },
        "teams": {
            "home": {
                "id": 33,
                "name": "Manchester United",
                "logo": "https://media.api-sports.io/football/teams/33.png",
            },
            "away": {
                "id": 34,
                "name": "Newcastle",
                "logo": "https://media.api-sports.io/football/teams/34.png",
            },
        },
        "goals": {"home": home_goals, "away": away_goals},
    }


def odds_payload() -> list[dict]:
    return [
        {
            "bookmakers": [
                {
                    "name": "Bet365",
                    "bets": [
                        {
                            "name": "Match Winner",
                            "values": [
                                {"value": "Home", "odd": "1.85"},
                                {"value": "Draw", "odd": "3.40"},
                                {"value": "Away", "odd": "4.20"},
                            ],
                        }
                    ],
                }
            ]
        }
    ]


class StubFootballApiClient:
    def __init__(
        self,
        fixtures: dict[tuple[int, int], list[dict]] | None = None,
        odds: dict[int, list[dict]] | None = None,
        failing_odds_ids: frozenset[int] = frozenset(),
    ) -> None:
        self.fixtures = fixtures or {}
        self.odds = odds or {}
        self.failing_odds_ids = set(failing_odds_ids)
        self.odds_calls: list[int] = []

    def get_fixtures(self, league: int, season: int) -> list[dict]:
        return self.fixtures.get((league, season), [])

    def get_odds(self, fixture_id: int) -> list[dict]:
        self.odds_calls.append(fixture_id)
        if fixture_id in self.failing_odds_ids:
            raise FootballApiError(f"odds fetch failed for {fixture_id}")
        return self.odds.get(fixture_id, [])


def test_map_fixture_status_maps_finished_and_live_codes() -> None:
    assert map_fixture_status("FT") == "finished"
    assert map_fixture_status("1H") == "live"
    assert map_fixture_status("NS") == "scheduled"


def test_parse_kickoff_parses_utc_timestamp() -> None:
    kickoff = parse_kickoff("2024-08-16T19:00:00+00:00")

    assert kickoff == datetime(2024, 8, 16, 19, 0)
    assert kickoff.tzinfo is None


def test_parse_kickoff_normalizes_z_suffix_to_utc_naive() -> None:
    kickoff = parse_kickoff("2024-08-16T19:00:00Z")

    assert kickoff == datetime(2024, 8, 16, 19, 0)
    assert kickoff.tzinfo is None


def test_extract_match_winner_odds_skips_malformed_values() -> None:
    bookmaker = {
        "name": "Bet365",
        "bets": [
            {
                "name": "Match Winner",
                "values": [
                    {"value": "Home", "odd": "not-a-number"},
                    {"value": "Draw", "odd": "3.40"},
                    {"value": "Away", "odd": "4.20"},
                ],
            },
            {
                "name": "Match Winner",
                "values": [
                    {"value": "Home", "odd": "1.85"},
                    {"value": "Draw", "odd": "3.40"},
                    {"value": "Away", "odd": "4.20"},
                ],
            },
        ],
    }

    odds = extract_match_winner_odds(bookmaker)

    assert odds == ("Bet365", 1.85, 3.4, 4.2)


def test_extract_match_winner_odds_reads_home_draw_away_values() -> None:
    bookmaker = {
        "name": "Bet365",
        "bets": [
            {
                "name": "Match Winner",
                "values": [
                    {"value": "Home", "odd": "1.85"},
                    {"value": "Draw", "odd": "3.40"},
                    {"value": "Away", "odd": "4.20"},
                ],
            }
        ],
    }

    odds = extract_match_winner_odds(bookmaker)

    assert odds == ("Bet365", 1.85, 3.4, 4.2)


def test_import_league_season_persists_fixture_scores_and_odds(
    db_session: Session,
) -> None:
    fixture = sample_fixture()
    client = StubFootballApiClient(
        fixtures={(39, 2024): [fixture]},
        odds={
            1001: [
                {
                    "bookmakers": [
                        {
                            "name": "Bet365",
                            "bets": [
                                {
                                    "name": "Match Winner",
                                    "values": [
                                        {"value": "Home", "odd": "1.85"},
                                        {"value": "Draw", "odd": "3.40"},
                                        {"value": "Away", "odd": "4.20"},
                                    ],
                                }
                            ],
                        }
                    ]
                }
            ]
        },
    )
    importer = HistoricalDataImporter(db_session, client=client)

    summary = importer.import_league_season(league_id=39, season=2024)

    assert summary.competitions == 1
    assert summary.teams == 2
    assert summary.matches == 1
    assert summary.odds == 1

    match = db_session.query(Match).one()
    assert match.external_id == 1001
    assert match.status == "finished"
    assert match.home_goals == 2
    assert match.away_goals == 1

    odds = db_session.query(Odds).one()
    assert odds.bookmaker == "Bet365"
    assert odds.home == 1.85


def test_import_league_season_is_idempotent(db_session: Session) -> None:
    fixture = sample_fixture()
    client = StubFootballApiClient(fixtures={(39, 2024): [fixture]})
    importer = HistoricalDataImporter(db_session, client=client, import_odds=False)

    first = importer.import_league_season(league_id=39, season=2024)
    second = importer.import_league_season(league_id=39, season=2024)

    assert first.matches == 1
    assert second.matches == 0
    assert db_session.query(Competition).count() == 1
    assert db_session.query(Team).count() == 2
    assert db_session.query(Match).count() == 1


def test_odds_failure_does_not_abort_batch(db_session: Session) -> None:
    failing = sample_fixture(fixture_id=1001)
    ok = sample_fixture(fixture_id=1002)
    client = StubFootballApiClient(
        odds={1002: odds_payload()},
        failing_odds_ids=frozenset({1001}),
    )
    importer = HistoricalDataImporter(db_session, client=client)

    summary = importer.import_fixture_items([failing, ok], default_season=2024)

    # Both fixtures persist even though one odds call raised.
    assert summary.matches == 2
    assert db_session.query(Match).count() == 2
    # The healthy match still got its odds; the failure is counted, not fatal.
    assert summary.odds == 1
    assert summary.odds_failed == 1
    assert db_session.query(Odds).count() == 1


def test_odds_circuit_breaker_stops_after_repeated_failures(
    db_session: Session,
) -> None:
    fixture_count = MAX_CONSECUTIVE_ODDS_FAILURES + 3
    fixtures = [
        sample_fixture(fixture_id=2000 + index) for index in range(fixture_count)
    ]
    failing_ids = frozenset(fixture["fixture"]["id"] for fixture in fixtures)
    client = StubFootballApiClient(failing_odds_ids=failing_ids)
    importer = HistoricalDataImporter(db_session, client=client)

    summary = importer.import_fixture_items(fixtures, default_season=2024)

    # All fixtures still imported.
    assert summary.matches == fixture_count
    assert db_session.query(Match).count() == fixture_count
    # Odds attempts stop once the breaker opens, so we don't keep burning quota.
    assert len(client.odds_calls) == MAX_CONSECUTIVE_ODDS_FAILURES
    assert summary.odds_failed == MAX_CONSECUTIVE_ODDS_FAILURES
    assert summary.odds == 0


@pytest.mark.parametrize(
    ("home_goals", "away_goals"),
    [
        (0, 0),
        (None, None),
    ],
)
def test_scheduled_fixture_persists_provider_goals(
    db_session: Session,
    home_goals: int | None,
    away_goals: int | None,
) -> None:
    fixture = sample_fixture(status="NS", home_goals=home_goals, away_goals=away_goals)
    client = StubFootballApiClient(fixtures={(39, 2024): [fixture]})
    importer = HistoricalDataImporter(db_session, client=client, import_odds=False)

    importer.import_league_season(league_id=39, season=2024)

    match = db_session.query(Match).one()
    assert match.status == "scheduled"
    assert match.home_goals == home_goals
    assert match.away_goals == away_goals
