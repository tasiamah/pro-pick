from __future__ import annotations

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Applicatie-instellingen, geladen uit environment variables / .env."""

    model_config = SettingsConfigDict(
        env_file=".env", env_file_encoding="utf-8", extra="ignore"
    )

    app_name: str = "VoetbalAI"
    environment: str = "development"

    database_url: str = "sqlite:///./voetbalai.db"

    football_api_base_url: str = "https://v3.football.api-sports.io"
    football_api_key: str = ""

    value_bet_edge_threshold: float = 0.05
    kelly_fraction: float = 0.25

    cors_origins: str = "*"

    @property
    def cors_origin_list(self) -> list[str]:
        if self.cors_origins.strip() == "*":
            return ["*"]
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
