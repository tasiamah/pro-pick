from __future__ import annotations

from unittest.mock import MagicMock, patch

import pytest

from app.scripts.sync_live_fixtures import main
from app.services.ingestion_alerts import IngestionPipelineError

pytestmark = pytest.mark.unit


@patch("app.scripts.sync_live_fixtures.alert_ingestion_failure")
@patch("app.scripts.sync_live_fixtures.run_live_sync")
@patch("app.scripts.sync_live_fixtures.SessionLocal")
def test_main_returns_1_when_pipeline_error_occurs(
    mock_session_local: MagicMock,
    mock_run_live_sync: MagicMock,
    mock_alert: MagicMock,
    capsys: pytest.CaptureFixture[str],
) -> None:
    mock_db = MagicMock()
    mock_session_local.return_value = mock_db
    error = IngestionPipelineError("All 3 fixture date fetches failed")
    mock_run_live_sync.side_effect = error

    exit_code = main([])

    assert exit_code == 1
    mock_alert.assert_called_once_with(
        source="cli.sync_live_fixtures",
        message="All 3 fixture date fetches failed",
        exc_info=error,
    )
    captured = capsys.readouterr()
    assert captured.err == "Live sync failed: All 3 fixture date fetches failed\n"
    mock_db.close.assert_called_once()


@patch("app.scripts.sync_live_fixtures.alert_ingestion_failure")
@patch("app.scripts.sync_live_fixtures.run_live_sync")
@patch("app.scripts.sync_live_fixtures.SessionLocal")
def test_main_returns_1_when_unexpected_error_occurs(
    mock_session_local: MagicMock,
    mock_run_live_sync: MagicMock,
    mock_alert: MagicMock,
    capsys: pytest.CaptureFixture[str],
) -> None:
    mock_db = MagicMock()
    mock_session_local.return_value = mock_db
    error = RuntimeError("database unavailable")
    mock_run_live_sync.side_effect = error

    exit_code = main([])

    assert exit_code == 1
    mock_alert.assert_called_once_with(
        source="cli.sync_live_fixtures",
        message="Live sync failed",
        exc_info=error,
    )
    captured = capsys.readouterr()
    assert captured.err == "Live sync failed: database unavailable\n"
    mock_db.close.assert_called_once()
