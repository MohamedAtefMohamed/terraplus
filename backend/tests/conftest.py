from __future__ import annotations

import os
import tempfile
from pathlib import Path

import pytest

TEST_ROOT = Path(tempfile.mkdtemp(prefix="terraplus-test-"))
os.environ["DATA_DIR"] = str(TEST_ROOT / "data")
os.environ["ENVIRONMENT"] = "test"
os.environ["LIVE_DISCOVERY_ENABLED"] = "true"
os.environ["OPENAI_API_KEY"] = ""
os.environ["NASA_EARTHDATA_USERNAME"] = ""
os.environ["NASA_EARTHDATA_PASSWORD"] = ""

from fastapi.testclient import TestClient  # noqa: E402

from app.main import app  # noqa: E402


@pytest.fixture(scope="session")
def client():
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture
def catalog(monkeypatch):
    """Deterministic stand-in for the live ASF catalogue."""
    import app.services.live.store as store

    granule = {
        "id": "NISAR_L1_PR_RSLC_TEST_001",
        "platform": "NISAR",
        "sensor": "L-SAR",
        "product_level": "RSLC",
        "product_type": "RSLC",
        "start": "2026-11-01T00:00:00Z",
        "end": "2026-11-01T00:00:30Z",
        "flight_direction": "ASCENDING",
        "track": 34,
        "frame": 105,
        "polarization": ["HH", "HV"],
        "center_lat": 29.6,
        "center_lon": -91.4,
        "browse_thumbnail": "https://example.test/thumb.png",
        "browse_latlon": "https://example.test/latlon.png",
        "download_url": "https://example.test/product",
        "footprint": [
            [-91.6, 29.5],
            [-91.1, 29.5],
            [-91.1, 29.9],
            [-91.6, 29.9],
            [-91.6, 29.5],
        ],
        "source": "ASF DAAC",
    }

    def fake_recent_nisar(bbox=None, days=45, limit=40):
        return {
            "ok": True,
            "error": None,
            "scope": "aoi" if bbox else "global-fallback",
            "count": 1,
            "items": [granule],
            "query": {"bbox": bbox, "days": days, "start": "", "end": "", "limit": limit},
            "queried_at": "2026-11-01T00:00:00Z",
            "source": "test",
            "limitations": "test",
        }

    def fake_scenes(bbox, days=90, limit=80):
        return [
            {
                "id": "S1_TEST_BEFORE",
                "datetime": "2026-10-01T00:00:00Z",
                "relative_orbit": 63,
                "orbit_state": "ascending",
                "platform": "Sentinel-1",
                "instrument_mode": "IW",
                "polarizations": ["VV", "VH"],
                "resolution_m": 20,
            },
            {
                "id": "S1_TEST_AFTER",
                "datetime": "2026-10-13T00:00:00Z",
                "relative_orbit": 63,
                "orbit_state": "ascending",
                "platform": "Sentinel-1",
                "instrument_mode": "IW",
                "polarizations": ["VV", "VH"],
                "resolution_m": 20,
            },
        ]

    def fake_available(bbox, days=90):
        return {"ok": True, "count": 2, "pair": None, "pair_error": None, "items": [], "source": "test"}

    monkeypatch.setattr(store, "recent_nisar", fake_recent_nisar)
    monkeypatch.setattr(store, "available_scenes", fake_available)
    return {"granule": granule, "scenes": fake_scenes}