from __future__ import annotations

import os
import tempfile
from pathlib import Path

import pytest

TEST_ROOT = Path(tempfile.mkdtemp(prefix="terraplus-test-"))
os.environ["DATA_DIR"] = str(TEST_ROOT / "data")
os.environ["DATABASE_URL"] = f"sqlite:///{TEST_ROOT / 'terraplus.db'}"
os.environ["DATA_MODE"] = "demo"
os.environ["LIVE_DISCOVERY_ENABLED"] = "false"
os.environ["OPENAI_API_KEY"] = ""
os.environ["NASA_EARTHDATA_USERNAME"] = ""
os.environ["NASA_EARTHDATA_PASSWORD"] = ""

from fastapi.testclient import TestClient  # noqa: E402

from app.main import app  # noqa: E402


@pytest.fixture(scope="session")
def client():
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture(scope="session")
def demo_locations(client):
    response = client.get("/api/locations")
    assert response.status_code == 200
    return response.json()
