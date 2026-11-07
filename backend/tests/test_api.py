from __future__ import annotations

from datetime import datetime


def test_health_reports_demo_mode(client):
    response = client.get("/api/health")
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "ok"
    assert body["data_mode"] == "demo"
    assert body["analysis_mode"] == "demo"
    assert body["database"] == "ok"


def test_config_status_without_credentials(client):
    response = client.get("/api/config/status")
    assert response.status_code == 200
    body = response.json()
    assert body["data"]["effective_mode"] == "demo"
    assert body["data"]["is_synthetic"] is True
    assert body["nisar"]["earthdata_credentials_configured"] is False
    assert body["nisar"]["download_supported"] is False
    assert body["llm"]["enabled"] is False
    assert "deterministic" in body["llm"]["note"].lower()


def test_data_sources_are_attributed(client):
    response = client.get("/api/data-sources")
    assert response.status_code == 200
    sources = response.json()["sources"]
    keys = {source["key"] for source in sources}
    assert {"nisar-mission", "asf-search", "nisar-sample", "terraplus-demo"}.issubset(keys)
    assert all(source["url"] for source in sources)
    sample = next(source for source in sources if source["key"] == "nisar-sample")
    assert sample["is_available"] is False
    demo = next(source for source in sources if source["key"] == "terraplus-demo")
    assert "synthetic" in demo["description"].lower()


def test_dashboard_summary(client):
    response = client.get("/api/dashboard/summary")
    assert response.status_code == 200
    body = response.json()
    assert body["stats"]["locations"] == 3
    assert body["stats"]["observations"] == 12
    assert body["stats"]["analyses"] >= 9
    assert len(body["recent_analyses"]) >= 3
    assert body["data_status"]["label"].startswith("DEMO")
    assert any("synthetic" in note.lower() for note in body["notes"])
    for location in body["locations"]:
        assert location["observation_count"] == 4
        assert location["latest_analysis"] is not None


def test_locations_and_observations(client, demo_locations):
    assert {location["slug"] for location in demo_locations} == {
        "sundarbans",
        "atchafalaya",
        "mekong",
    }
    sundarbans = next(item for item in demo_locations if item["slug"] == "sundarbans")
    response = client.get("/api/observations", params={"location": "sundarbans"})
    assert response.status_code == 200
    observations = response.json()
    assert len(observations) == 4
    assert all(item["location_slug"] == "sundarbans" for item in observations)
    assert all(item["is_synthetic"] is True for item in observations)
    assert all("NISAR" not in item["mission"] for item in observations)
    dates = [datetime.fromisoformat(item["acquired_at"]) for item in observations]
    assert dates == sorted(dates, reverse=True)
    assert sundarbans["bbox"] == observations[0]["bbox"]

    detail = client.get(f"/api/observations/{observations[0]['id']}")
    assert detail.status_code == 200
    assert detail.json()["preview_url"].startswith("/media/")


def test_observation_search_disabled_returns_clean_error(client, demo_locations):
    response = client.get("/api/observations/search", params={"location": "sundarbans"})
    assert response.status_code == 200
    body = response.json()
    assert body["ok"] is False
    assert "disabled" in body["error"].lower()


def test_observation_search_validates_bbox(client):
    response = client.get("/api/observations/search", params={"bbox": "10,20,30"})
    assert response.status_code == 422
    response = client.get("/api/observations/search", params={"bbox": "0,0,500,10"})
    assert response.status_code == 422


def test_compare_flow_and_artifacts(client):
    observations = client.get("/api/observations", params={"location": "sundarbans"}).json()
    chronological = sorted(observations, key=lambda item: item["acquired_at"])
    response = client.post(
        "/api/analysis/compare",
        json={
            "before_observation_id": chronological[0]["id"],
            "after_observation_id": chronological[2]["id"],
            "method": "water_change",
            "change_threshold_db": 3.0,
            "water_threshold_db": -17.0,
        },
    )
    assert response.status_code == 201, response.text
    body = response.json()
    assert body["status"] == "completed"
    assert body["is_synthetic"] is True
    assert body["data_mode"] == "demo"
    assert body["change_area_km2"] > 0
    assert body["water_gain_km2"] > 0
    assert 0 <= body["confidence_score"] <= 1
    assert body["limitations"]
    assert "flood" in " ".join(body["limitations"]).lower()
    assert body["before_preview_url"].startswith("/media/")
    assert body["water_overlay_url"].startswith("/media/")

    analysis_id = body["id"]
    assert client.get(f"/api/analysis/{analysis_id}").status_code == 200
    stats = client.get(f"/api/analysis/{analysis_id}/statistics").json()
    assert stats["rows"]
    assert stats["analysis_id"] == analysis_id
    assert stats["quality"]["score"] >= 0

    geojson = client.get(f"/api/analysis/{analysis_id}/geojson")
    assert geojson.status_code == 200
    payload = geojson.json()
    assert payload["type"] == "FeatureCollection"
    assert payload["metadata"]["is_synthetic"] is True
    assert "not a flood extent" in payload["metadata"]["disclaimer"].lower()


def test_compare_rejects_different_locations(client):
    sundarbans = client.get("/api/observations", params={"location": "sundarbans"}).json()
    mekong = client.get("/api/observations", params={"location": "mekong"}).json()
    response = client.post(
        "/api/analysis/compare",
        json={
            "before_observation_id": sundarbans[0]["id"],
            "after_observation_id": mekong[0]["id"],
        },
    )
    assert response.status_code == 400


def test_compare_rejects_identical_observations(client):
    observation = client.get("/api/observations", params={"location": "sundarbans"}).json()[0]
    response = client.post(
        "/api/analysis/compare",
        json={
            "before_observation_id": observation["id"],
            "after_observation_id": observation["id"],
        },
    )
    assert response.status_code == 422


def test_compare_unknown_observation(client):
    response = client.post(
        "/api/analysis/compare",
        json={"before_observation_id": 999999, "after_observation_id": 888888},
    )
    assert response.status_code == 404


def test_explanation_works_without_llm_key(client):
    analysis = client.get("/api/analysis").json()[0]
    response = client.get(f"/api/analysis/{analysis['id']}/explanation")
    assert response.status_code == 200
    body = response.json()
    assert body["mode"] == "deterministic"
    assert body["headline"]
    assert len(body["observations"]) >= 4
    assert body["interpretation"]
    assert body["technical_indicators"]
    assert 0 <= body["confidence"]["score"] <= 1
    assert "probability" in body["confidence"]["important"].lower()
    assert body["analysis_period"]["before"] < body["analysis_period"]["after"]
    assert body["source_data"][0]["is_synthetic"] is True
    assert body["limitations"]
    assert "not a scientific finding" in body["disclaimer"].lower()


def test_timeline(client):
    response = client.get("/api/timeline", params={"location": "atchafalaya"})
    assert response.status_code == 200
    body = response.json()
    assert body["location"]["slug"] == "atchafalaya"
    assert len(body["observations"]) == 4
    assert len(body["comparisons"]) == 3
    assert all(item["is_synthetic"] for item in body["observations"])
    assert all(item["metrics"]["water_fraction"] > 0 for item in body["observations"])
    assert "synthetic" in body["trend_summary"].lower()
    assert response.json()["is_synthetic"] is True


def test_timeline_missing_location(client):
    response = client.get("/api/timeline", params={"location": "atlantis"})
    assert response.status_code == 404


def test_layers_demo_disclaimer(client):
    response = client.get("/api/layers")
    assert response.status_code == 200
    body = response.json()
    assert body["mode"] == "demo"
    keys = [layer["key"] for layer in body["layers"]]
    assert keys == [
        "radar_observations",
        "detected_changes",
        "water_change",
        "wetland_monitoring",
    ]
    assert "not real" in body["disclaimer"].lower()


def test_media_preview_available(client):
    observation = client.get("/api/observations", params={"location": "mekong"}).json()[0]
    response = client.get(observation["preview_url"])
    assert response.status_code == 200
    assert response.headers["content-type"] == "image/png"


def test_404s(client):
    assert client.get("/api/locations/nope").status_code == 404
    assert client.get("/api/observations/999999").status_code == 404
    assert client.get("/api/analysis/999999").status_code == 404
    assert client.get("/api/analysis/999999/explanation").status_code == 404
