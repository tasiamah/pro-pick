from __future__ import annotations

from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings, loaded from environment variables / .env."""

    model_config = SettingsConfigDict(
        env_file=".env", env_file_encoding="utf-8", extra="ignore"
    )

    app_name: str = "VoetbalAI"
    environment: str = "development"

    database_url: str = "sqlite:///./voetbalai.db"

    football_api_base_url: str = "https://v3.football.api-sports.io"
    football_api_key: str = ""
    football_api_timeout_seconds: float = 20.0
    football_api_max_retries: int = 3
    football_api_min_request_interval_seconds: float = 0.6

    sync_league_ids: str = "39,140"
    sync_date_offsets: str = "-1,0,1"
    scheduler_enabled: bool = False
    scheduler_daily_hour: int = Field(default=6, ge=0, le=23)
    scheduler_import_odds: bool = True

    value_bet_edge_threshold: float = 0.05
    kelly_fraction: float = 0.25

    model_path: str = ""
    model_algorithm: str = "logistic"
    model_calibrate: bool = True

    cache_ttl_seconds: int = 30

    rate_limit_enabled: bool = True
    rate_limit_requests: int = 120
    rate_limit_window_seconds: float = 60.0

    cors_origins: str = "*"

    @property
    def is_production(self) -> bool:
        return self.environment.strip().lower() in {"production", "prod"}

    @property
    def cors_origin_list(self) -> list[str]:
        if self.cors_origins.strip() == "*":
            return ["*"]
        return [
            origin.strip() for origin in self.cors_origins.split(",") if origin.strip()
        ]

    @property
    def sync_league_id_list(self) -> tuple[int, ...]:
        return tuple(
            int(value.strip())
            for value in self.sync_league_ids.split(",")
            if value.strip()
        )

    @property
    def sync_date_offset_list(self) -> tuple[int, ...]:
        return tuple(
            int(value.strip())
            for value in self.sync_date_offsets.split(",")
            if value.strip()
        )

    def _validate_sync_settings(self, errors: list[str]) -> None:
        try:
            league_ids = self.sync_league_id_list
        except ValueError:
            errors.append("SYNC_LEAGUE_IDS must be a comma-separated list of integers.")
            league_ids = ()

        if not league_ids:
            errors.append("SYNC_LEAGUE_IDS must include at least one league id.")

        try:
            date_offsets = self.sync_date_offset_list
        except ValueError:
            errors.append(
                "SYNC_DATE_OFFSETS must be a comma-separated list of integers."
            )
            date_offsets = ()

        if not date_offsets:
            errors.append("SYNC_DATE_OFFSETS must include at least one day offset.")

    def validate_for_runtime(self) -> None:
        errors: list[str] = []
        self._validate_sync_settings(errors)

        if not self.is_production:
            if errors:
                detail = "\n".join(f"- {message}" for message in errors)
                raise ValueError(f"Invalid configuration:\n{detail}")
            return

        if self.database_url.startswith("sqlite"):
            errors.append(
                "DATABASE_URL must use PostgreSQL in production (not SQLite)."
            )

        if not self.football_api_key.strip():
            errors.append("FOOTBALL_API_KEY is required in production.")

        if errors:
            detail = "\n".join(f"- {message}" for message in errors)
            raise ValueError(f"Invalid production configuration:\n{detail}")


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
