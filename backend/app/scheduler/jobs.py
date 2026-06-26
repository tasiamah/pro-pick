"""Scheduled jobs for the data pipeline."""

from __future__ import annotations

import logging

from apscheduler.schedulers.background import BackgroundScheduler

from app.core.config import settings
from app.core.database import SessionLocal
from app.services.live_sync import run_live_sync

logger = logging.getLogger(__name__)

scheduler = BackgroundScheduler()


def daily_update() -> None:
    logger.info("Starting daily live sync")
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
    except Exception:
        logger.exception("Daily live sync failed")
    finally:
        db.close()


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
