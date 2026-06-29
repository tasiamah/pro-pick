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
from app.ml.storage import load_model, resolve_model_path
from app.ml.train import train_model
from app.services.ingestion_alerts import alert_ingestion_failure
from app.services.live_sync import run_live_sync, sync_value_bets_for_upcoming
from app.services.prediction import refresh_predictions_for_upcoming, reset_model_cache

logger = logging.getLogger(__name__)

SCHEDULER_LOCK_ID = 514901

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
                reset_model_cache()
                refreshed = refresh_predictions_for_upcoming(db)
                value_bets = sync_value_bets_for_upcoming(db)
                logger.info(
                    "Model retraining complete: version %s on %s matches; "
                    "%s predictions refreshed, %s value bets recomputed",
                    bundle.metadata.version,
                    bundle.metadata.n_samples,
                    refreshed,
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


def bootstrap_model_if_missing() -> None:
    """Train an initial model in the background when none is present.

    A freshly deployed instance has no model artifact on its ephemeral disk and
    would otherwise serve the neutral fallback until the first scheduled
    retraining. Training runs in a daemon thread so it never blocks startup or
    health checks; the existing scheduler lock keeps concurrent workers safe.
    """
    if not settings.model_bootstrap_enabled:
        return

    if load_model(resolve_model_path(settings.model_path)) is not None:
        logger.info("Existing model found; skipping startup bootstrap")
        return

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


def stop_scheduler() -> None:
    if scheduler.running:
        scheduler.shutdown(wait=False)
        logger.info("Scheduler stopped")
