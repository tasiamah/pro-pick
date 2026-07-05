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

    sync_league_ids: str = "39,140,1"
    # Days (relative to today) the live sync fetches fixtures + odds for. -1 keeps
    # yesterday for settling finished matches; the forward week gives upcoming
    # matches (e.g. a World Cup bracket) odds ahead of kickoff instead of only the
    # next day. Each forward day costs ~1 fixtures call + 1 /odds call per match,
    # so widen further only on a paid API tier.
    sync_date_offsets: str = "-1,0,1,2,3,4,5,6,7"
    scheduler_enabled: bool = False
    scheduler_daily_hour: int = Field(default=6, ge=0, le=23)
    scheduler_import_odds: bool = True

    # Minimum model_prob - implied_prob gap before flagging a value bet. 2% surfaces
    # more picks than 3% while staying conservative; tune via env on Render.
    value_bet_edge_threshold: float = 0.02
    kelly_fraction: float = 0.25
    # Quality guard: skip flagging longshots and low-certainty picks as value
    # bets. Models are least reliable on long odds, so capping them keeps the
    # surfaced bets sensible. value_bet_min_confidence is the minimum margin
    # over the next-best outcome (see value_bets.confidence_score); 0 disables.
    value_bet_max_odds: float = Field(default=6.0, gt=1.0)
    value_bet_min_confidence: float = Field(default=0.0, ge=0.0, le=1.0)

    model_path: str = ""
    model_algorithm: str = "logistic"
    model_calibrate: bool = True
    model_retraining_enabled: bool = False
    model_retraining_interval_days: int = Field(default=7, ge=1)
    # Train an initial model in the background on startup if none exists yet, so
    # a fresh deploy serves real predictions instead of the neutral fallback
    # without waiting for the first scheduled retraining interval.
    model_bootstrap_enabled: bool = True
    # A pick is "confident" when its top 1X2 probability clears this bar. Used to
    # report high-precision accuracy on the confident subset (vs full-slate
    # accuracy, which the ~25% draw rate caps). 0.70 yields ~70% accuracy on the
    # ~19% of matches the model is surest about (walk-forward OOS).
    model_confidence_threshold: float = Field(default=0.7, gt=0.0, le=1.0)

    cache_ttl_seconds: int = Field(default=30, ge=0)

    rate_limit_enabled: bool = True
    rate_limit_requests: int = Field(default=120, ge=1)
    rate_limit_window_seconds: float = Field(default=60.0, gt=0)

    cors_origins: str = "*"

    notifications_enabled: bool = True
    expo_access_token: str = ""
    notification_test_secret: str = ""
    live_notification_poll_minutes: int = Field(default=3, ge=1, le=60)
    scheduler_live_notifications_enabled: bool = True

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
