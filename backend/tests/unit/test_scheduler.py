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


@patch("app.scheduler.jobs.run_live_sync")
@patch("app.scheduler.jobs.SessionLocal")
def test_daily_update_runs_live_sync_and_closes_session(
    mock_session_local: MagicMock,
    mock_run_live_sync: MagicMock,
) -> None:
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
