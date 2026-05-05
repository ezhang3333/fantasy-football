from __future__ import annotations
from functools import lru_cache
from typing import Literal

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore", case_sensitive=False)

    database_url: str = Field(
        default="file:./model/outputs/predictions.sqlite3",
        validation_alias="DATABASE_URL",
    )
    turso_auth_token: str | None = Field(default=None, validation_alias="TURSO_AUTH_TOKEN")

    frontend_url: str = Field(
        default="http://localhost:5173,http://localhost:3000",
        validation_alias="FRONTEND_URL",
    )

    environment: Literal["development", "production"] = "development"
    allow_training: bool = True

    data_dir: str = "pipeline_data/final"
    model_dir: str = "model/artifacts"

    @property
    def cors_origins_list(self) -> list[str]:
        return [origin.strip() for origin in self.frontend_url.split(",") if origin.strip()]


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()
