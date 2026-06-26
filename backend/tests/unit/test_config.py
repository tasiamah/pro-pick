import pytest

from app.core.config import Settings

pytestmark = pytest.mark.unit

PRODUCTION_BASE = {
    "environment": "production",
    "database_url": "postgresql+psycopg2://user:pass@host:5432/db",
    "football_api_key": "secret-key",
}


def test_development_allows_sqlite_without_api_key() -> None:
    settings = Settings(
        environment="development",
        database_url="sqlite:///./test.db",
        football_api_key="",
    )

    settings.validate_for_runtime()


def test_production_accepts_postgres_and_api_key() -> None:
    settings = Settings(**PRODUCTION_BASE)

    settings.validate_for_runtime()


@pytest.mark.parametrize(
    ("database_url", "football_api_key", "match"),
    [
        ("sqlite:///./test.db", "secret-key", "PostgreSQL"),
        (
            "postgresql+psycopg2://user:pass@host:5432/db",
            "",
            "FOOTBALL_API_KEY",
        ),
    ],
)
def test_production_rejects_missing_secrets(
    database_url: str,
    football_api_key: str,
    match: str,
) -> None:
    settings = Settings(
        environment="production",
        database_url=database_url,
        football_api_key=football_api_key,
    )

    with pytest.raises(ValueError, match=match):
        settings.validate_for_runtime()


def test_validate_for_runtime_rejects_invalid_sync_league_ids() -> None:
    settings = Settings(sync_league_ids="39,abc")

    with pytest.raises(ValueError, match="SYNC_LEAGUE_IDS"):
        settings.validate_for_runtime()


def test_validate_for_runtime_rejects_empty_sync_date_offsets() -> None:
    settings = Settings(sync_date_offsets="")

    with pytest.raises(ValueError, match="SYNC_DATE_OFFSETS"):
        settings.validate_for_runtime()


def test_validate_for_runtime_rejects_invalid_scheduler_hour() -> None:
    with pytest.raises(ValueError):
        Settings(scheduler_daily_hour=24)
