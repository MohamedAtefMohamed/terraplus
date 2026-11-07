"""Application configuration.

All runtime configuration is environment driven. TerraPulse deliberately ships
with no credentials and no remote-service dependency: DEMO mode must always work.
"""

from __future__ import annotations

import os
from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_DIR = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(".env", "../.env"),
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
    )

    app_name: str = "TerraPulse API"
    version: str = "1.0.0"
    api_prefix: str = "/api"
    environment: str = "development"
    cors_origins: str = "http://localhost:3000,http://127.0.0.1:3000"

    # --- Data modes -------------------------------------------------------
    # demo  : generated, clearly-labelled synthetic SAR scenes (always works)
    # sample: pre-staged real sample rasters described by data/sample/manifest.json
    # live  : live NISAR granule discovery through ASF / NASA CMR STAC
    # auto  : use sample if staged, otherwise demo
    data_mode: str = "demo"
    live_discovery_enabled: bool = True

    # --- Storage ----------------------------------------------------------
    data_dir: Path = BACKEND_DIR / "data"
    database_url: str | None = None
    max_analysis_pixels: int = 4_000_000
    compare_rate_limit_per_minute: int = 40

    # --- NASA Earthdata (optional) ---------------------------------------
    nasa_earthdata_username: str | None = None
    nasa_earthdata_password: str | None = None
    asf_search_url: str = "https://api.daac.asf.alaska.edu/services/search/param"
    stac_api_url: str = "https://cmr.earthdata.nasa.gov/stac/ASF"
    live_search_timeout_seconds: float = 12.0
    live_search_max_results: int = 50

    # --- Optional LLM narration (the app never requires it) ---------------
    # Narration is opt-in so an ambient OPENAI_API_KEY on the host cannot
    # silently start paid external calls in the demo.
    enable_llm_narration: bool = False
    openai_api_key: str | None = None
    openai_base_url: str = "https://api.openai.com/v1"
    openai_model: str = "gpt-4o-mini"
    llm_timeout_seconds: float = 25.0

    # --- Processing defaults ---------------------------------------------
    default_change_threshold_db: float = 3.0
    default_water_threshold_db: float = -17.0

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]

    @property
    def media_dir(self) -> Path:
        return self.data_dir / "media"

    @property
    def raster_dir(self) -> Path:
        return self.data_dir / "rasters"

    @property
    def demo_dir(self) -> Path:
        return self.data_dir / "demo"

    @property
    def sample_dir(self) -> Path:
        return self.data_dir / "sample"

    @property
    def sample_manifest_path(self) -> Path:
        return self.sample_dir / "manifest.json"

    @property
    def resolved_database_url(self) -> str:
        if self.database_url:
            return self.database_url
        return f"sqlite:///{self.data_dir / 'terraplus.db'}"

    @property
    def has_earthdata_credentials(self) -> bool:
        return bool(self.nasa_earthdata_username and self.nasa_earthdata_password)

    @property
    def has_llm_credentials(self) -> bool:
        return bool(self.enable_llm_narration and self.openai_api_key)

    @property
    def requested_mode(self) -> str:
        mode = (self.data_mode or "demo").lower()
        return mode if mode in {"demo", "sample", "live", "auto"} else "demo"

    def ensure_dirs(self) -> None:
        for path in (
            self.data_dir,
            self.media_dir,
            self.raster_dir,
            self.demo_dir,
            self.sample_dir,
        ):
            path.mkdir(parents=True, exist_ok=True)


@lru_cache
def get_settings() -> Settings:
    settings = Settings()
    settings.ensure_dirs()
    return settings


def reset_settings_cache() -> None:
    """Test helper: drop the cached settings instance."""
    get_settings.cache_clear()
    os.environ.pop("_TERRAPULSE_SETTINGS", None)
