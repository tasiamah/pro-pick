from __future__ import annotations

from unittest.mock import MagicMock, patch

import pytest

from app.scheduler.jobs import daily_update, scheduler, start_scheduler, stop_scheduler
from app.services.historical_import import ImportSummary
from app.services.live_sync import LiveSyncSummary

pytestmark = pytest.mark.unit


@pytest.fixture(autouse=True)
def reset_scheduler() -> None:
    stop_scheduler()
    scheduler.remove_all_jobs()
    yield
    stop_scheduler()
    scheduler.remove_all_jobs()


@patch("app.scheduler.jobs.settings")
@patch("app.scheduler.jobs.run_live_sync")
@patch("app.scheduler.jobs.SessionLocal")
def test_daily_update_runs_live_sync_and_closes_session(
    mock_session_local: MagicMock,
    mock_run_live_sync: MagicMock,
    mock_settings: MagicMock,
) -> None:
    mock_settings.database_url = "sqlite:///./test.db"
    mock_db = MagicMock()
    mock_session_local.return_value = mock_db
    mock_run_live_sync.return_value = LiveSyncSummary(
        fixtures_fetched=4,
        import_summary=ImportSummary(matches=3, odds=5),
        predictions=3,
        value_bets=2,
    )

    daily_update()

    mock_run_live_sync.assert_called_once_with(mock_db)
    mock_db.close.assert_called_once()


@patch("app.scheduler.jobs._release_scheduler_lock")
@patch("app.scheduler.jobs._try_acquire_scheduler_lock", return_value=False)
@patch("app.scheduler.jobs.engine.connect")
@patch("app.scheduler.jobs.settings")
@patch("app.scheduler.jobs.run_live_sync")
@patch("app.scheduler.jobs.SessionLocal")
def test_daily_update_skips_when_lock_not_acquired(
    mock_session_local: MagicMock,
    mock_run_live_sync: MagicMock,
    mock_settings: MagicMock,
    mock_connect: MagicMock,
    mock_try_acquire: MagicMock,
    mock_release: MagicMock,
) -> None:
    mock_settings.database_url = "postgresql+psycopg2://example"
    mock_lock_connection = MagicMock()
    mock_connect.return_value = mock_lock_connection

    daily_update()

    mock_connect.assert_called_once()
    mock_try_acquire.assert_called_once_with(mock_lock_connection)
    mock_run_live_sync.assert_not_called()
    mock_session_local.assert_not_called()
    mock_release.assert_called_once_with(mock_lock_connection)
    mock_lock_connection.close.assert_called_once()


@patch("app.scheduler.jobs._release_scheduler_lock")
@patch("app.scheduler.jobs._try_acquire_scheduler_lock", return_value=True)
@patch("app.scheduler.jobs.engine.connect")
@patch("app.scheduler.jobs.settings")
@patch("app.scheduler.jobs.run_live_sync")
@patch("app.scheduler.jobs.SessionLocal")
def test_daily_update_uses_dedicated_lock_connection(
    mock_session_local: MagicMock,
    mock_run_live_sync: MagicMock,
    mock_settings: MagicMock,
    mock_connect: MagicMock,
    mock_try_acquire: MagicMock,
    mock_release: MagicMock,
) -> None:
    mock_settings.database_url = "postgresql+psycopg2://example"
    mock_lock_connection = MagicMock()
    mock_connect.return_value = mock_lock_connection
    mock_db = MagicMock()
    mock_session_local.return_value = mock_db
    mock_run_live_sync.return_value = LiveSyncSummary(fixtures_fetched=0)

    daily_update()

    mock_try_acquire.assert_called_once_with(mock_lock_connection)
    mock_run_live_sync.assert_called_once_with(mock_db)
    mock_release.assert_called_once_with(mock_lock_connection)
    mock_lock_connection.close.assert_called_once()


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
