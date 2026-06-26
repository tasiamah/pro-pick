"""Scheduled jobs for the data pipeline."""

from __future__ import annotations

import logging

from apscheduler.schedulers.background import BackgroundScheduler

from app.core.config import settings
from app.core.database import SessionLocal
from app.services.daily_import import run_daily_import

logger = logging.getLogger(__name__)

scheduler = BackgroundScheduler()


def daily_update() -> None:
    logger.info("Starting daily data update")
    db = SessionLocal()
    try:
        summary = run_daily_import(
            db,
            import_odds=settings.scheduler_import_odds,
        )
        logger.info(
            "Daily update complete: %s new matches, %s odds rows, "
            "%s new teams, %s new competitions",
            summary.matches,
            summary.odds,
            summary.teams,
            summary.competitions,
        )
    except Exception:
        logger.exception("Daily update failed")
    finally:
        db.close()


def start_scheduler() -> None:
    if not settings.scheduler_enabled:
        logger.info("Scheduler disabled; skipping daily update job registration")
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
        "Scheduler started; daily update scheduled at %02d:00 UTC",
        settings.scheduler_daily_hour,
    )


def stop_scheduler() -> None:
    if scheduler.running:
        scheduler.shutdown(wait=False)
        logger.info("Scheduler stopped")
