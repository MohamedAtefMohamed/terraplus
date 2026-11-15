from __future__ import annotations

from app.services.live.areas import AREAS


def test_health_is_live(client):
    body = client.get("/api/health").json()
    assert body["status"] == "ok"
    assert body["data_mode"] == "live"
    assert body["analysis_mode"] == "live"


def test_config_reports_live_mode(client):
    body = client.get("/api/config/status").json()
    assert body["data"]["effective_mode"] == "live"
    assert body["data"]["is_synthetic"] is False
    assert body["data"]["label"] == "LIVE DATA"
    assert body["defaults"]["change_threshold_db"] > 0


def test_data_sources_are_live_only(client):
    body = client.get("/api/data-sources").json()
    assert body["mode"] == "live"
    names = {source["name"] for source in body["sources"]}
    assert "ASF DAAC search API" in names
    assert "Element 84 Earth Search" in names


def test_locations_are_real_and_not_synthetic(client, catalog):
    rows = client.get("/api/locations").json()
    slugs = {row["slug"] for row in rows}
    assert slugs == {area.slug for area in AREAS}
    assert len(rows) >= 12
    assert all(row["is_demo"] is False for row in rows)
    assert all(row["category"] for row in rows)
    atchafalaya = next(row for row in rows if row["slug"] == "atchafalaya")
    assert atchafalaya["bbox"][0] < atchafalaya["bbox"][2]
    count = atchafalaya["observation_count"]
    # Counts warm in a background pass, so they may be null on a cold instance.
    assert count is None or count >= 0
    for row in rows:
        west, south, east, north = row["bbox"]
        assert -180 <= west < east <= 180 and -90 <= south < north <= 90


def test_area_catalogue_lists_categories(client):
    body = client.get("/api/areas").json()
    assert body["count"] >= 12
    assert len(body["areas"]) == body["count"]
    assert "Ice & snow" in body["categories"]
    assert all(area["category"] in body["categories"] for area in body["areas"])


def test_observations_come_from_the_catalogue(client, catalog):
    rows = client.get("/api/observations", params={"location": "atchafalaya"}).json()
    assert rows
    first = rows[0]
    assert first["mission"] == "NISAR"
    assert first["data_mode"] == "live"
    assert first["is_synthetic"] is False
    assert first["preview_url"].startswith("https://")

    detail = client.get(f"/api/observations/{first['id']}").json()
    assert detail["external_id"] == first["external_id"]


def test_layers_are_live(client):
    body = client.get("/api/layers").json()
    assert body["mode"] == "live"
    assert len(body["layers"]) == 4
    assert all(layer["data_mode"] == "live" for layer in body["layers"])


def test_analysis_list_is_empty_until_a_comparison_runs(client):
    assert client.get("/api/analysis").json() == []


def test_dashboard_is_live_only(client, catalog):
    body = client.get("/api/dashboard/summary").json()
    assert body["data_status"]["label"] == "LIVE DATA"
    assert body["data_status"]["is_synthetic"] is False
    assert body["stats"]["locations"] == len(AREAS)
    assert body["stats"]["observations"] >= 0
    assert all(obs["is_synthetic"] is False for obs in body["recent_observations"])


def test_timeline_uses_scenes(client, catalog):
    body = client.get("/api/timeline", params={"location": "atchafalaya"}).json()
    assert body["is_synthetic"] is False
    assert body["data_mode"] == "live"
    assert body["location"]["slug"] == "atchafalaya"


def test_unknown_location_returns_404(client):
    assert client.get("/api/locations/nowhere").status_code == 404
    assert client.get("/api/timeline", params={"location": "nowhere"}).status_code == 404