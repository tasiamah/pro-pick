from __future__ import annotations

"""Geplande taken (EPIC-2 / Dag 2).

Dagelijkse update: data + odds ophalen, voorspellingen genereren en
value bets (her)berekenen. Stub met APScheduler-opzet voor later.
"""

from apscheduler.schedulers.background import BackgroundScheduler

scheduler = BackgroundScheduler()


def daily_update() -> None:
    """Placeholder voor de dagelijkse data- en predictie-update."""
    # Volgt in de datapijplijn-tickets.
    pass


def start_scheduler() -> None:
    scheduler.add_job(daily_update, "cron", hour=6, id="daily_update")
    scheduler.start()
