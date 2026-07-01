"""Scheduled jobs for the data pipeline."""

from __future__ import annotations

import logging
import threading
from collections.abc import Iterator
from contextlib import closing, contextmanager
from zoneinfo import ZoneInfo

from apscheduler.schedulers.background import BackgroundScheduler
from sqlalchemy import text
from sqlalchemy.engine import Connection

from app.core.config import settings
from app.core.database import SessionLocal, engine
from app.ml.features import FEATURE_COLUMNS
from app.ml.market_train import train_all_market_models
from app.ml.storage import active_model_path, load_model, resolve_model_path
from app.ml.train import train_model
from app.services.ingestion_alerts import alert_ingestion_failure
from app.services.live_sync import run_live_sync, sync_value_bets_for_upcoming
from app.services.market_prediction import (
    refresh_market_predictions_for_upcoming,
    reset_market_model_cache,
)
from app.services.match_notification_events import run_live_notification_sync
from app.services.prediction import refresh_predictions_for_upcoming, reset_model_cache

logger = logging.getLogger(__name__)

SCHEDULER_LOCK_ID = 514901

# While at least one tracked match is live, poll this often (minutes) so
# match start/end and other live events fire close to real time.
LIVE_ACTIVE_POLL_MINUTES = 1

scheduler = BackgroundScheduler(timezone=ZoneInfo("UTC"))


def _try_acquire_scheduler_lock(connection: Connection) -> bool:
    acquired = connection.execute(
        text("SELECT pg_try_advisory_lock(:lock_id)"),
        {"lock_id": SCHEDULER_LOCK_ID},
    ).scalar_one()
    return bool(acquired)


def _release_scheduler_lock(connection: Connection) -> None:
    connection.execute(
        text("SELECT pg_advisory_unlock(:lock_id)"),
        {"lock_id": SCHEDULER_LOCK_ID},
    )


@contextmanager
def _scheduler_lock() -> Iterator[bool]:
    """Yield whether this worker may run the job (single-flight across workers)."""
    if settings.database_url.startswith("sqlite"):
        yield True
        return

    lock_connection = engine.connect()
    acquired = False
    try:
        acquired = _try_acquire_scheduler_lock(lock_connection)
        yield acquired
    finally:
        with closing(lock_connection):
            if acquired:
                _release_scheduler_lock(lock_connection)


def daily_update() -> None:
    logger.info("Starting daily live sync")
    try:
        with _scheduler_lock() as acquired:
            if not acquired:
                logger.info(
                    "Another worker holds the scheduler lock; skipping daily live sync"
                )
                return

            db = SessionLocal()
            try:
                summary = run_live_sync(db)
                import_summary = summary.import_summary
                logger.info(
                    "Daily live sync complete: %s fixtures, %s new matches, "
                    "%s odds rows, %s predictions, %s value bets",
                    summary.fixtures_fetched,
                    import_summary.matches if import_summary else 0,
                    import_summary.odds if import_summary else 0,
                    summary.predictions,
                    summary.value_bets,
                )
            finally:
                db.close()
    except Exception as exc:
        alert_ingestion_failure(
            source="scheduler.daily_update",
            message="Daily live sync failed",
            exc_info=exc,
        )
        logger.exception("Daily live sync failed")


def retrain_model() -> None:
    logger.info("Starting model retraining")
    try:
        with _scheduler_lock() as acquired:
            if not acquired:
                logger.info(
                    "Another worker holds the scheduler lock; skipping model retraining"
                )
                return

            db = SessionLocal()
            try:
                bundle = train_model(
                    db,
                    algorithm=settings.model_algorithm,
                    path=resolve_model_path(settings.model_path),
                )
                market_bundles = train_all_market_models(
                    db,
                    model_path=settings.model_path,
                )
                reset_model_cache()
                reset_market_model_cache()
                refreshed = refresh_predictions_for_upcoming(db)
                market_refreshed = refresh_market_predictions_for_upcoming(
                    db,
                    model_bundles=market_bundles,
                )
                value_bets = sync_value_bets_for_upcoming(db)
                logger.info(
                    "Model retraining complete: version %s on %s matches; "
                    "%s predictions refreshed, %s market predictions refreshed, "
                    "%s value bets recomputed",
                    bundle.metadata.version,
                    bundle.metadata.n_samples,
                    refreshed,
                    market_refreshed,
                    value_bets,
                )
            finally:
                db.close()
    except Exception as exc:
        alert_ingestion_failure(
            source="scheduler.retrain_model",
            message="Model retraining failed",
            exc_info=exc,
        )
        logger.exception("Model retraining failed")


def _adjust_live_poll_interval(has_live_matches: bool) -> None:
    """Speed the poll up to 1 minute while games are live, relax it otherwise."""
    if not scheduler.running:
        return

    desired_minutes = (
        LIVE_ACTIVE_POLL_MINUTES
        if has_live_matches
        else settings.live_notification_poll_minutes
    )
    job = scheduler.get_job("live_notification_poll")
    if job is None:
        return

    interval = getattr(job.trigger, "interval", None)
    if interval is not None and interval.total_seconds() == desired_minutes * 60:
        return

    scheduler.reschedule_job(
        "live_notification_poll",
        trigger="interval",
        minutes=desired_minutes,
    )
    logger.info(
        "Live notification poll interval set to %s minute(s)",
        desired_minutes,
    )


def live_notification_poll() -> None:
    if not settings.notifications_enabled:
        return

    logger.info("Starting live notification poll")
    try:
        with _scheduler_lock() as acquired:
            if not acquired:
                logger.info(
                    "Another worker holds the scheduler lock; "
                    "skipping notification poll"
                )
                return

            db = SessionLocal()
            try:
                summary = run_live_notification_sync(db)
                logger.info(
                    "Live notification poll complete: %s events, %s sent, %s failed",
                    summary.events_detected,
                    summary.messages_sent,
                    summary.messages_failed,
                )
            finally:
                db.close()

            _adjust_live_poll_interval(summary.live_matches > 0)
    except Exception as exc:
        alert_ingestion_failure(
            source="scheduler.live_notification_poll",
            message="Live notification poll failed",
            exc_info=exc,
        )
        logger.exception("Live notification poll failed")


def bootstrap_model_if_missing() -> None:
    """Train a model in the background when none is present or its schema is stale.

    A freshly deployed instance serves the shipped pretrained baseline (see
    ``PRETRAINED_MODEL_PATH``), so it never falls back to neutral probabilities.
    This still retrains in two cases: there is no usable artifact at all, or the
    active model's ``feature_columns`` no longer match the code (e.g. the deploy
    added features the shipped baseline predates), since such a model would
    mispredict. Training runs in a daemon thread so it never blocks startup or
    health checks; the scheduler lock keeps concurrent workers safe.
    """
    if not settings.model_bootstrap_enabled:
        return

    try:
        existing_model = load_model(active_model_path(settings.model_path))
    except Exception:
        # A corrupt or version-incompatible artifact must not crash startup;
        # treat it as missing so we retrain a fresh, loadable model.
        logger.warning(
            "Failed to load existing model artifact; treating as missing",
            exc_info=True,
        )
        existing_model = None

    if existing_model is not None:
        if list(existing_model.metadata.feature_columns) == list(FEATURE_COLUMNS):
            logger.info("Existing model is up to date; skipping startup bootstrap")
            return
        logger.info("Model feature schema is stale; scheduling background retrain")
    else:
        logger.info("No model found; scheduling background bootstrap training")

    thread = threading.Thread(target=retrain_model, name="model-bootstrap", daemon=True)
    thread.start()


def start_scheduler() -> None:
    if not settings.scheduler_enabled:
        logger.info("Scheduler disabled; skipping daily live sync job registration")
        return

    if scheduler.running:
        return

    scheduler.add_job(
        daily_update,
        "cron",
        hour=settings.scheduler_daily_hour,
        id="daily_update",
        replace_existing=True,
        max_instances=1,
        coalesce=True,
    )

    if settings.model_retraining_enabled:
        scheduler.add_job(
            retrain_model,
            "interval",
            days=settings.model_retraining_interval_days,
            id="retrain_model",
            replace_existing=True,
            max_instances=1,
            coalesce=True,
        )

    if settings.scheduler_live_notifications_enabled and settings.notifications_enabled:
        scheduler.add_job(
            live_notification_poll,
            "interval",
            minutes=settings.live_notification_poll_minutes,
            id="live_notification_poll",
            replace_existing=True,
            max_instances=1,
            coalesce=True,
        )

    scheduler.start()
    logger.info(
        "Scheduler started; daily live sync scheduled at %02d:00 UTC",
        settings.scheduler_daily_hour,
    )
    if settings.model_retraining_enabled:
        logger.info(
            "Model retraining scheduled every %s day(s)",
            settings.model_retraining_interval_days,
        )
    if settings.scheduler_live_notifications_enabled:
        logger.info(
            "Live notification poll scheduled every %s minute(s)",
            settings.live_notification_poll_minutes,
        )


def stop_scheduler() -> None:
    if scheduler.running:
        scheduler.shutdown(wait=False)
        logger.info("Scheduler stopped")
