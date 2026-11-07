from __future__ import annotations

import asyncio

from app.services.nasa.asf_client import search_asf
from app.services.nasa.data_normalizer import normalize_asf_feature, normalize_stac_feature
from app.services.nasa.sample_loader import sample_status


def _asf_feature() -> dict:
    return {
        "type": "Feature",
        "id": "fixture",
        "geometry": {
            "type": "Polygon",
            "coordinates": [
                [
                    [-92.0, 29.0],
                    [-91.0, 29.0],
                    [-91.0, 30.0],
                    [-92.0, 30.0],
                    [-92.0, 29.0],
                ]
            ],
        },
        "properties": {
            "platform": "NISAR",
            "processingLevel": "GCOV",
            "mainBandPolarization": "VV",
            "flightDirection": "ASCENDING",
            "pathNumber": 105,
            "frameNumber": 17,
            "startTime": "2026-10-19T11:19:03Z",
            "stopTime": "2026-10-19T11:19:37Z",
            "bytes": 123456789,
            "url": "https://example.invalid/NISAR_L2_PR_GCOV_demo.h5",
            "browse": [
                "https://example.invalid/preview.png",
                "https://example.invalid/thumbnail.png",
            ],
            "sceneName": "NISAR_L2_PR_GCOV_033_105_A_017",
        },
    }


def test_asf_normalizer_keeps_attribution_and_metadata_only_state():
    item = normalize_asf_feature(_asf_feature())
    assert item["mission"] == "NISAR"
    assert item["product_type"] == "GCOV"
    assert item["polarization"] == "VV"
    assert item["center_lat"] == 29.5
    assert item["center_lon"] == -91.5
    assert item["bbox"] == [-92.0, 29.0, -91.0, 30.0]
    assert item["browse_url"].endswith("thumbnail.png")
    assert item["raster_available"] is False
    assert item["data_mode"] == "live"
    assert item["is_synthetic"] is False
    assert "metadata" in item["access_note"].lower()
    assert item["download_url"].startswith("https://example.invalid/")


def test_non_nisar_platform_is_not_relabelled():
    feature = _asf_feature()
    feature["properties"]["platform"] = "Sentinel-1"
    item = normalize_asf_feature(feature)
    assert item["mission"] == "Sentinel-1"
    assert item["mission"] != "NISAR"


def test_stac_normalizer_extracts_polarization_and_asset():
    item = normalize_stac_feature(
        {
            "id": "stac-fixture",
            "collection": "asf-nisar",
            "geometry": {
                "type": "Polygon",
                "coordinates": [
                    [
                        [88.9, 21.7],
                        [89.4, 21.7],
                        [89.4, 22.1],
                        [88.9, 22.1],
                        [88.9, 21.7],
                    ]
                ],
            },
            "properties": {
                "platform": "NISAR",
                "datetime": "2026-09-10T05:00:00Z",
                "sar:polarizations": ["HH", "HV"],
                "sar:product_type": "GCOV",
            },
            "assets": {"data": {"href": "https://example.invalid/data.h5"}},
        }
    )
    assert item["provider"] == "STAC"
    assert item["mission"] == "NISAR"
    assert item["polarization"] == ["HH", "HV"]
    assert item["download_url"].endswith("data.h5")
    assert item["raster_available"] is False


def test_live_search_disabled_is_a_clean_error():
    result = asyncio.run(search_asf([88.9, 21.7, 89.4, 22.1], start="2026-01-01", end="2026-02-01"))
    assert result.ok is False
    assert result.error and "disabled" in result.error.lower()
    assert result.items == []


def test_sample_mode_is_honest_when_no_manifest_is_staged():
    status = sample_status()
    assert status["available"] is False
    assert status["observation_count"] == 0
    assert "fall back" in status["note"].lower() or "no staged" in status["note"].lower()
