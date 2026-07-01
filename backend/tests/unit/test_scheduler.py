from __future__ import annotations

from unittest.mock import MagicMock, patch

import pytest

from app.ml.features import FEATURE_COLUMNS
from app.scheduler.jobs import (
    bootstrap_model_if_missing,
    daily_update,
    retrain_model,
    scheduler,
    start_scheduler,
    stop_scheduler,
)
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
    mock_release.assert_not_called()
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


@patch("app.scheduler.jobs.alert_ingestion_failure")
@patch("app.scheduler.jobs.settings")
@patch("app.scheduler.jobs.run_live_sync")
@patch("app.scheduler.jobs.SessionLocal")
def test_daily_update_alerts_when_live_sync_fails(
    mock_session_local: MagicMock,
    mock_run_live_sync: MagicMock,
    mock_settings: MagicMock,
    mock_alert: MagicMock,
) -> None:
    mock_settings.database_url = "sqlite:///./test.db"
    mock_db = MagicMock()
    mock_session_local.return_value = mock_db
    error = RuntimeError("database unavailable")
    mock_run_live_sync.side_effect = error

    daily_update()

    mock_alert.assert_called_once_with(
        source="scheduler.daily_update",
        message="Daily live sync failed",
        exc_info=error,
    )
    mock_db.close.assert_called_once()


@patch("app.scheduler.jobs.sync_value_bets_for_upcoming")
@patch("app.scheduler.jobs.refresh_market_predictions_for_upcoming")
@patch("app.scheduler.jobs.reset_market_model_cache")
@patch("app.scheduler.jobs.train_all_market_models")
@patch("app.scheduler.jobs.reset_model_cache")
@patch("app.scheduler.jobs.refresh_predictions_for_upcoming")
@patch("app.scheduler.jobs.train_model")
@patch("app.scheduler.jobs.settings")
@patch("app.scheduler.jobs.SessionLocal")
def test_retrain_model_trains_refreshes_predictions_and_value_bets(
    mock_session_local: MagicMock,
    mock_settings: MagicMock,
    mock_train_model: MagicMock,
    mock_refresh: MagicMock,
    mock_reset_cache: MagicMock,
    mock_train_markets: MagicMock,
    mock_reset_market_cache: MagicMock,
    mock_refresh_markets: MagicMock,
    mock_sync_value_bets: MagicMock,
) -> None:
    mock_settings.database_url = "sqlite:///./test.db"
    mock_settings.model_algorithm = "logistic"
    mock_settings.model_path = ""
    mock_db = MagicMock()
    mock_session_local.return_value = mock_db
    market_bundles = {"btts": MagicMock()}
    mock_train_markets.return_value = market_bundles

    retrain_model()

    mock_train_model.assert_called_once()
    mock_train_markets.assert_called_once_with(mock_db, model_path="")
    mock_reset_cache.assert_called_once_with()
    mock_reset_market_cache.assert_called_once_with()
    mock_refresh.assert_called_once_with(mock_db)
    mock_refresh_markets.assert_called_once_with(mock_db, model_bundles=market_bundles)
    mock_sync_value_bets.assert_called_once_with(mock_db)
    mock_db.close.assert_called_once()


@patch("app.scheduler.jobs.alert_ingestion_failure")
@patch("app.scheduler.jobs.train_model")
@patch("app.scheduler.jobs.settings")
@patch("app.scheduler.jobs.SessionLocal")
def test_retrain_model_alerts_when_training_fails(
    mock_session_local: MagicMock,
    mock_settings: MagicMock,
    mock_train_model: MagicMock,
    mock_alert: MagicMock,
) -> None:
    mock_settings.database_url = "sqlite:///./test.db"
    mock_settings.model_algorithm = "logistic"
    mock_settings.model_path = ""
    mock_db = MagicMock()
    mock_session_local.return_value = mock_db
    error = RuntimeError("no training data")
    mock_train_model.side_effect = error

    retrain_model()

    mock_alert.assert_called_once_with(
        source="scheduler.retrain_model",
        message="Model retraining failed",
        exc_info=error,
    )
    mock_db.close.assert_called_once()


@patch("app.scheduler.jobs.threading.Thread")
@patch("app.scheduler.jobs.load_model", return_value=None)
@patch("app.scheduler.jobs.settings")
def test_bootstrap_trains_in_background_when_no_model(
    mock_settings: MagicMock,
    mock_load_model: MagicMock,
    mock_thread: MagicMock,
) -> None:
    mock_settings.model_bootstrap_enabled = True
    mock_settings.model_path = ""

    bootstrap_model_if_missing()

    mock_thread.assert_called_once()
    assert mock_thread.call_args.kwargs["target"] is retrain_model
    assert mock_thread.call_args.kwargs["daemon"] is True
    mock_thread.return_value.start.assert_called_once_with()


@patch("app.scheduler.jobs.threading.Thread")
@patch("app.scheduler.jobs.load_model", side_effect=RuntimeError("corrupt artifact"))
@patch("app.scheduler.jobs.settings")
def test_bootstrap_trains_when_existing_model_fails_to_load(
    mock_settings: MagicMock,
    mock_load_model: MagicMock,
    mock_thread: MagicMock,
) -> None:
    mock_settings.model_bootstrap_enabled = True
    mock_settings.model_path = ""

    bootstrap_model_if_missing()

    mock_thread.assert_called_once()
    mock_thread.return_value.start.assert_called_once_with()


@patch("app.scheduler.jobs.threading.Thread")
@patch("app.scheduler.jobs.load_model")
@patch("app.scheduler.jobs.settings")
def test_bootstrap_skips_when_model_present_and_schema_matches(
    mock_settings: MagicMock,
    mock_load_model: MagicMock,
    mock_thread: MagicMock,
) -> None:
    mock_settings.model_bootstrap_enabled = True
    mock_settings.model_path = ""
    up_to_date = MagicMock()
    up_to_date.metadata.feature_columns = list(FEATURE_COLUMNS)
    mock_load_model.return_value = up_to_date

    bootstrap_model_if_missing()

    mock_thread.assert_not_called()


@patch("app.scheduler.jobs.threading.Thread")
@patch("app.scheduler.jobs.load_model")
@patch("app.scheduler.jobs.settings")
def test_bootstrap_retrains_when_feature_schema_is_stale(
    mock_settings: MagicMock,
    mock_load_model: MagicMock,
    mock_thread: MagicMock,
) -> None:
    mock_settings.model_bootstrap_enabled = True
    mock_settings.model_path = ""
    stale = MagicMock()
    stale.metadata.feature_columns = ["home_form_points"]
    mock_load_model.return_value = stale

    bootstrap_model_if_missing()

    mock_thread.assert_called_once()
    mock_thread.return_value.start.assert_called_once_with()


@patch("app.scheduler.jobs.threading.Thread")
@patch("app.scheduler.jobs.load_model")
@patch("app.scheduler.jobs.settings")
def test_bootstrap_skips_when_disabled(
    mock_settings: MagicMock,
    mock_load_model: MagicMock,
    mock_thread: MagicMock,
) -> None:
    mock_settings.model_bootstrap_enabled = False

    bootstrap_model_if_missing()

    mock_load_model.assert_not_called()
    mock_thread.assert_not_called()


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
    mock_settings.model_retraining_enabled = False
    mock_settings.scheduler_live_notifications_enabled = False

    start_scheduler()

    assert scheduler.running
    assert scheduler.get_job("daily_update") is not None
    assert scheduler.get_job("retrain_model") is None
    assert scheduler.get_job("live_notification_poll") is None


@patch("app.scheduler.jobs.settings")
def test_start_scheduler_registers_retrain_job_when_enabled(
    mock_settings: MagicMock,
) -> None:
    mock_settings.scheduler_enabled = True
    mock_settings.scheduler_daily_hour = 6
    mock_settings.model_retraining_enabled = True
    mock_settings.model_retraining_interval_days = 7
    mock_settings.scheduler_live_notifications_enabled = False

    start_scheduler()

    assert scheduler.running
    assert scheduler.get_job("retrain_model") is not None


@patch("app.scheduler.jobs.settings")
def test_start_scheduler_registers_live_notification_poll_when_enabled(
    mock_settings: MagicMock,
) -> None:
    mock_settings.scheduler_enabled = True
    mock_settings.scheduler_daily_hour = 6
    mock_settings.model_retraining_enabled = False
    mock_settings.notifications_enabled = True
    mock_settings.scheduler_live_notifications_enabled = True
    mock_settings.live_notification_poll_minutes = 3

    start_scheduler()

    assert scheduler.get_job("live_notification_poll") is not None
