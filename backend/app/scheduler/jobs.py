"""Scheduled jobs for the data pipeline."""

from __future__ import annotations

import logging
from contextlib import closing

from apscheduler.schedulers.background import BackgroundScheduler
from sqlalchemy import text
from sqlalchemy.engine import Connection

from app.core.config import settings
from app.core.database import SessionLocal, engine
from app.services.live_sync import run_live_sync

logger = logging.getLogger(__name__)

SCHEDULER_LOCK_ID = 514901

scheduler = BackgroundScheduler()


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


def daily_update() -> None:
    logger.info("Starting daily live sync")
    lock_connection: Connection | None = None

    try:
        if not settings.database_url.startswith("sqlite"):
            lock_connection = engine.connect()
            if not _try_acquire_scheduler_lock(lock_connection):
                logger.info(
                    "Another worker holds the scheduler lock; skipping daily live sync"
                )
                return

        db = SessionLocal()
        try:
            summary = run_live_sync(db)
            import_summary = summary.import_summary
            logger.info(
                "Daily live sync complete: %s fixtures, %s new matches, %s odds rows, "
                "%s predictions, %s value bets",
                summary.fixtures_fetched,
                import_summary.matches if import_summary else 0,
                import_summary.odds if import_summary else 0,
                summary.predictions,
                summary.value_bets,
            )
        finally:
            db.close()
    except Exception:
        logger.exception("Daily live sync failed")
    finally:
        if lock_connection is not None:
            with closing(lock_connection):
                _release_scheduler_lock(lock_connection)


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
    scheduler.start()
    logger.info(
        "Scheduler started; daily live sync scheduled at %02d:00 UTC",
        settings.scheduler_daily_hour,
    )


def stop_scheduler() -> None:
    if scheduler.running:
        scheduler.shutdown(wait=False)
        logger.info("Scheduler stopped")
