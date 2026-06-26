from __future__ import annotations

from datetime import UTC, datetime
from unittest.mock import MagicMock, patch

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.core.database import Base
from app.scheduler.jobs import daily_update, scheduler, start_scheduler, stop_scheduler
from app.services.daily_import import current_season_year, run_daily_import
from app.services.data_ingestion import FootballApiError
from app.services.historical_import import ImportSummary

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


@pytest.fixture(autouse=True)
def reset_scheduler() -> None:
    stop_scheduler()
    scheduler.remove_all_jobs()
    yield
    stop_scheduler()
    scheduler.remove_all_jobs()


@pytest.mark.parametrize(
    ("now", "expected"),
    [
        (datetime(2026, 6, 15, tzinfo=UTC), 2025),
        (datetime(2025, 8, 1, tzinfo=UTC), 2025),
        (datetime(2025, 1, 10, tzinfo=UTC), 2024),
    ],
)
def test_current_season_year(now: datetime, expected: int) -> None:
    assert current_season_year(now) == expected


@patch("app.services.daily_import.HistoricalDataImporter.import_league_season")
def test_run_daily_import_merges_successful_leagues(
    mock_import: MagicMock,
    db_session: Session,
) -> None:
    mock_import.side_effect = [
        ImportSummary(matches=2, odds=4),
        ImportSummary(matches=1, odds=2, teams=1),
    ]

    summary = run_daily_import(
        db_session,
        league_ids=(39, 140),
        season=2024,
        import_odds=True,
    )

    assert summary.matches == 3
    assert summary.odds == 6
    assert summary.teams == 1
    assert mock_import.call_count == 2


@patch("app.services.daily_import.HistoricalDataImporter.import_league_season")
def test_run_daily_import_continues_after_provider_error(
    mock_import: MagicMock,
    db_session: Session,
) -> None:
    mock_import.side_effect = [
        FootballApiError("rate limit"),
        ImportSummary(matches=1),
    ]

    summary = run_daily_import(
        db_session,
        league_ids=(39, 140),
        season=2024,
        import_odds=False,
    )

    assert summary.matches == 1
    assert mock_import.call_count == 2


@patch("app.scheduler.jobs.run_daily_import")
@patch("app.scheduler.jobs.SessionLocal")
def test_daily_update_runs_import_and_closes_session(
    mock_session_local: MagicMock,
    mock_run_daily_import: MagicMock,
) -> None:
    mock_db = MagicMock()
    mock_session_local.return_value = mock_db
    mock_run_daily_import.return_value = ImportSummary(matches=3, odds=5)

    daily_update()

    mock_run_daily_import.assert_called_once_with(
        mock_db,
        import_odds=True,
    )
    mock_db.close.assert_called_once()


@patch("app.scheduler.jobs.settings")
def test_start_scheduler_skips_when_disabled(mock_settings: MagicMock) -> None:
    mock_settings.scheduler_enabled = False

    start_scheduler()

    assert not scheduler.running
    assert scheduler.get_jobs() == []


@patch("app.scheduler.jobs.settings")
def test_start_scheduler_registers_daily_job_when_enabled(
    mock_settings: MagicMock,
) -> None:
    mock_settings.scheduler_enabled = True
    mock_settings.scheduler_daily_hour = 7

    start_scheduler()

    assert scheduler.running
    job = scheduler.get_job("daily_update")
    assert job is not None
