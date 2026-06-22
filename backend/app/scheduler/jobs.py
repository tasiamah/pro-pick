"""Scheduled jobs (EPIC-2 / Day 2).

Daily update: fetch data + odds, generate predictions and (re)calculate
value bets. Stub with an APScheduler setup for later.
"""

from __future__ import annotations

from apscheduler.schedulers.background import BackgroundScheduler

scheduler = BackgroundScheduler()


def daily_update() -> None:
    """Placeholder for the daily data and prediction update."""
    # Follows in the data-pipeline tickets.
    pass


def start_scheduler() -> None:
    scheduler.add_job(daily_update, "cron", hour=6, id="daily_update")
    scheduler.start()
