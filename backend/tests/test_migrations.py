from __future__ import annotations

import os
import subprocess
import sys
from pathlib import Path

import pytest

BACKEND_DIR = Path(__file__).resolve().parents[1]


@pytest.fixture()
def fresh_sqlite_db(tmp_path, monkeypatch):
    db_path = tmp_path / "alembic_test.db"
    database_url = f"sqlite:///{db_path}"
    monkeypatch.setenv("DATABASE_URL", database_url)
    return database_url


def test_alembic_upgrade_head_creates_tables(fresh_sqlite_db):
    env = os.environ.copy()
    env["DATABASE_URL"] = fresh_sqlite_db

    result = subprocess.run(
        [sys.executable, "-m", "alembic", "upgrade", "head"],
        cwd=BACKEND_DIR,
        env=env,
        capture_output=True,
        text=True,
        check=False,
        timeout=60,
    )

    assert result.returncode == 0, result.stderr or result.stdout

    import sqlite3

    conn = sqlite3.connect(fresh_sqlite_db.replace("sqlite:///", ""))
    tables = {
        row[0]
        for row in conn.execute(
            "SELECT name FROM sqlite_master WHERE type='table'"
        ).fetchall()
    }
    conn.close()

    assert "competitions" in tables
    assert "teams" in tables
    assert "matches" in tables
    assert "odds" in tables
    assert "predictions" in tables
    assert "market_predictions" in tables
    assert "value_bets" in tables
    assert "device_push_tokens" in tables
    assert "match_notification_preferences" in tables
    assert "sent_notifications" in tables
    assert "match_state_snapshots" in tables
    assert "alembic_version" in tables
