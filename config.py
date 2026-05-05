from __future__ import annotations
from functools import lru_cache
from typing import Literal

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore", case_sensitive=False)

    turso_database_url: str = "file:./model/outputs/predictions.sqlite3"
    turso_auth_token: str | None = None

    cors_origins: str = "http://localhost:5173,http://localhost:3000"

    environment: Literal["development", "production"] = "development"
    allow_training: bool = True

    data_dir: str = "pipeline_data/final"
    model_dir: str = "model/artifacts"

    @property
    def cors_origins_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()
