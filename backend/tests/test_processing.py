from __future__ import annotations

import numpy as np
import pytest
import rasterio
from rasterio.transform import from_bounds

from app.services.processing.pipeline import (
    AlignmentError,
    AnalysisError,
    compare_metrics,
    compare_rasters,
)
from app.services.processing.raster_loader import RasterLoadError, load_raster


def _write_raster(path, array, bbox=(10.0, 10.0, 10.1, 10.1), nodata=-9999.0):
    height, width = array.shape
    profile = {
        "driver": "GTiff",
        "height": height,
        "width": width,
        "count": 1,
        "dtype": "float32",
        "crs": "EPSG:4326",
        "transform": from_bounds(*bbox, width, height),
        "nodata": nodata,
    }
    with rasterio.open(path, "w", **profile) as dataset:
        dataset.write(array.astype(np.float32), 1)
        dataset.update_tags(IS_SYNTHETIC="true", MISSION="test fixture")
    return path


def _scenes(tmp_path):
    before = np.full((64, 64), -10.0, dtype=np.float32)
    after = before.copy()
    after[10:22, 10:22] = -24.0  # new low-backscatter water indicator
    after[34:44, 34:44] = -2.0  # backscatter increase
    before_path = _write_raster(tmp_path / "before.tif", before)
    after_path = _write_raster(tmp_path / "after.tif", after)
    return before_path, after_path


def test_change_detection_statistics_and_outputs(tmp_path):
    before_path, after_path = _scenes(tmp_path)
    outcome = compare_rasters(
        before_path,
        after_path,
        tmp_path / "out",
        "unit-analysis",
        "2025-01-01",
        "2025-02-01",
        change_threshold_db=3.0,
        water_threshold_db=-17.0,
        is_synthetic=True,
    )

    stats = outcome.stats
    assert stats["valid_pixels"] == 64 * 64
    assert stats["changed_pixels"] > 0
    assert stats["increase_area_km2"] > 0
    assert stats["decrease_area_km2"] > 0
    assert stats["water_gain_km2"] > 0
    assert stats["water_loss_km2"] == 0
    assert stats["net_water_change_km2"] > 0
    assert stats["mean_change_db"] < 0
    assert 0 <= outcome.quality["score"] <= 1
    assert outcome.quality["alignment"]["aligned"] is True
    assert outcome.confidence if hasattr(outcome, "confidence") else True

    assert outcome.change_overlay_path.exists()
    assert outcome.water_overlay_path.exists()
    assert outcome.geojson_path.exists()
    assert outcome.geojson["type"] == "FeatureCollection"
    assert outcome.geojson["metadata"]["is_synthetic"] is True
    layers = {feature["properties"]["layer"] for feature in outcome.geojson["features"]}
    assert "new_water" in layers
    assert "backscatter_increase" in layers

    assert any("synthetic" in limitation.lower() for limitation in outcome.limitations)
    assert any("not a flood map" in limitation.lower() for limitation in outcome.limitations)
    assert "synthetic demonstration scenes" in outcome.summary
    assert "not" in outcome.interpretation.lower()


def test_compare_metrics_without_writing_assets(tmp_path):
    before_path, after_path = _scenes(tmp_path)
    result = compare_metrics(before_path, after_path)
    assert result["stats"]["changed_pixels"] > 0
    assert result["quality"]["score"] > 0
    assert not (tmp_path / "out").exists()


def test_misaligned_rasters_are_rejected(tmp_path):
    before = np.full((32, 32), -10.0, dtype=np.float32)
    after = before.copy()
    before_path = _write_raster(tmp_path / "a.tif", before, bbox=(10.0, 10.0, 10.1, 10.1))
    after_path = _write_raster(tmp_path / "b.tif", after, bbox=(10.05, 10.0, 10.15, 10.1))
    with pytest.raises(AlignmentError):
        compare_rasters(
            before_path,
            after_path,
            tmp_path / "out",
            "misaligned",
            "before",
            "after",
        )


def test_unsupported_method_is_rejected(tmp_path):
    before_path, after_path = _scenes(tmp_path)
    with pytest.raises(AnalysisError):
        compare_rasters(
            before_path,
            after_path,
            tmp_path / "out",
            "unsupported",
            "before",
            "after",
            method="insar_displacement",
        )


def test_nodata_is_handled(tmp_path):
    before = np.full((48, 48), -10.0, dtype=np.float32)
    after = before.copy()
    after[0:8, 0:8] = -24.0
    after_path = _write_raster(tmp_path / "after.tif", after)
    before[0:8, 0:8] = -9999.0
    before_path = _write_raster(tmp_path / "before.tif", before)
    outcome = compare_rasters(
        before_path, after_path, tmp_path / "out", "nodata", "before", "after"
    )
    assert outcome.stats["valid_coverage"] < 1.0
    assert outcome.stats["valid_pixels"] == 48 * 48 - 64
    assert outcome.stats["water_gain_pixels"] == 0


def test_raster_loader_rejects_missing_file(tmp_path):
    with pytest.raises(RasterLoadError):
        load_raster(tmp_path / "missing.tif")


def test_negative_change_threshold_rejected(tmp_path):
    before_path, after_path = _scenes(tmp_path)
    with pytest.raises(ValueError):
        compare_rasters(
            before_path,
            after_path,
            tmp_path / "out",
            "bad",
            "before",
            "after",
            change_threshold_db=-1,
        )
