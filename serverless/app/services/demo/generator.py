"""Synthetic SAR backscatter scene generator (DEMO MODE).

The generated GeoTIFFs carry realistic georeferencing, dB scaling, speckle and
nodata so the processing pipeline can be exercised exactly as it would be with
a real calibrated backscatter product. Every tag explicitly marks the scene as
synthetic. These pixels are not NISAR data and must never be presented as such.
"""

from __future__ import annotations

import math
from functools import lru_cache
from pathlib import Path

import numpy as np
import rasterio
from rasterio.transform import from_bounds
from scipy import ndimage

from app.services.demo.scenarios import DemoScenario, get_scenario
from app.services.processing.visualization import write_backscatter_preview

DISCLAIMER = (
    "TerraPulse SYNTHETIC demo scene. Generated for software demonstration only. "
    "Not a NISAR, Sentinel-1 or other real satellite acquisition. Not for any "
    "scientific, operational or safety decision."
)


def _normalise(array: np.ndarray) -> np.ndarray:
    minimum = float(array.min())
    maximum = float(array.max())
    if maximum - minimum < 1e-9:
        return np.zeros_like(array)
    return (array - minimum) / (maximum - minimum)


@lru_cache(maxsize=8)
def _base_fields(slug: str) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    scenario = get_scenario(slug)
    if scenario is None:
        raise KeyError(f"Unknown demo scenario: {slug}")
    shape = (256, 256)
    rng = np.random.default_rng(scenario.seed)

    coarse = ndimage.gaussian_filter(
        rng.normal(size=shape), sigma=scenario.noise_sigma, mode="reflect"
    )
    fine = ndimage.gaussian_filter(rng.normal(size=shape), sigma=3.4, mode="reflect")
    field = _normalise(
        (1.0 - scenario.fine_weight) * _normalise(coarse) + scenario.fine_weight * _normalise(fine)
    )

    urban_texture = ndimage.gaussian_filter(rng.normal(size=shape), sigma=4.5, mode="reflect")
    urban = urban_texture > np.percentile(urban_texture, 98.6)
    bare = fine < np.percentile(fine, 11)
    return field.astype(np.float32), urban, bare


def _coast_mask(shape: tuple[int, int], scenario: DemoScenario) -> np.ndarray:
    if not scenario.coast:
        return np.zeros(shape, dtype=bool)
    height, width = shape
    yy, xx = np.mgrid[0:height, 0:width]
    coast_line = scenario.coast_base + scenario.coast_amplitude * np.sin(
        2.0 * math.pi * (xx / max(width - 1, 1)) * 1.8 + scenario.seed * 0.73
    )
    return (yy / max(height - 1, 1)) > coast_line


def _river_mask(shape: tuple[int, int], scenario: DemoScenario) -> np.ndarray:
    if not scenario.river_points:
        return np.zeros(shape, dtype=bool)
    height, width = shape
    yy, xx = np.mgrid[0:height, 0:width].astype(np.float32)
    distance = np.full(shape, np.inf, dtype=np.float32)
    points = [(px * (width - 1), py * (height - 1)) for px, py in scenario.river_points]
    for (x1, y1), (x2, y2) in zip(points[:-1], points[1:], strict=True):
        dx, dy = x2 - x1, y2 - y1
        denom = dx * dx + dy * dy
        if denom < 1e-6:
            continue
        t = np.clip(((xx - x1) * dx + (yy - y1) * dy) / denom, 0.0, 1.0)
        segment_distance = np.sqrt((xx - (x1 + t * dx)) ** 2 + (yy - (y1 + t * dy)) ** 2)
        distance = np.minimum(distance, segment_distance)
    width_px = max(1.5, scenario.river_width * min(height, width) * 1.35)
    return distance < width_px


def _water_mask(scenario: DemoScenario, target_fraction: float) -> np.ndarray:
    field, _, _ = _base_fields(scenario.slug)
    base = _river_mask(field.shape, scenario) | _coast_mask(field.shape, scenario)
    total = field.size
    target = int(np.clip(target_fraction, 0.0, 0.9) * total)
    remaining = target - int(base.sum())
    water = base.copy()
    if remaining > 0:
        candidates = np.flatnonzero(~base)
        count = min(remaining, candidates.size)
        values = field.ravel()[candidates]
        chosen = (
            candidates
            if count >= values.size
            else candidates[np.argpartition(values, -count)[-count:]]
        )
        water.ravel()[chosen] = True
    return water


def generate_scene(
    scenario: DemoScenario,
    date_iso: str,
    target_water_fraction: float,
    raster_path: Path,
    preview_path: Path | None = None,
    scene_index: int = 0,
) -> dict:
    height, width = 256, 256
    field, urban, bare = _base_fields(scenario.slug)
    water = _water_mask(scenario, target_water_fraction)
    date_key = date_iso.replace("-", "").replace(":", "")
    rng = np.random.default_rng(scenario.seed * 10_007 + scene_index * 97)

    moisture = float(np.clip((target_water_fraction - 0.30) * 2.6, -0.8, 1.1))
    noise = rng.normal(size=(height, width)).astype(np.float32)
    fine_texture = ndimage.gaussian_filter(
        rng.normal(size=(height, width)), sigma=1.3, mode="reflect"
    ).astype(np.float32)

    db = np.full((height, width), -9.4, dtype=np.float32)
    db += (field - 0.5) * 2.6
    db += moisture
    db = np.where(bare, -14.1 + noise * 1.0, db).astype(np.float32)
    db = np.where(urban, -2.7 + noise * 0.7, db).astype(np.float32)
    db = np.where(water, -22.3 + noise * 1.1, db).astype(np.float32)
    db += fine_texture * 0.45

    # Four-look multiplicative speckle, added in linear power.
    speckle = rng.gamma(shape=4.0, scale=0.25, size=(height, width)).astype(np.float32)
    db = 10.0 * np.log10(np.clip(np.power(10.0, db / 10.0) * speckle, 1e-5, None))
    db = np.clip(db, -34.0, 6.0).astype(np.float32)

    invalid = rng.random((height, width)) < 0.0035
    invalid[0:12, -16:] = True  # exercise nodata handling
    nodata_value = -9999.0
    db[invalid] = nodata_value
    valid = ~invalid

    raster_path.parent.mkdir(parents=True, exist_ok=True)
    transform = from_bounds(*scenario.bbox, width, height)
    tags = {
        "MISSION": "TerraPulse Synthetic Demo",
        "PLATFORM": "Simulated SAR (not a real mission)",
        "INSTRUMENT": "Simulated C-band SAR",
        "PRODUCT_TYPE": "SYNTHETIC_DEMO_BACKSCATTER_DB",
        "ACQUISITION_MODE": "DEMO",
        "POLARIZATION": "VV",
        "UNITS": "dB",
        "IS_SYNTHETIC": "true",
        "DATA_SOURCE": "TerraPulse demo generator",
        "DISCLAIMER": DISCLAIMER,
        "SCENE_DATE": date_iso,
        "SCENE_INDEX": str(scene_index),
        "SCENARIO": scenario.scenario,
    }
    profile = {
        "driver": "GTiff",
        "height": height,
        "width": width,
        "count": 1,
        "dtype": "float32",
        "crs": "EPSG:4326",
        "transform": transform,
        "nodata": nodata_value,
        "compress": "deflate",
        "tiled": True,
    }
    with rasterio.open(raster_path, "w", **profile) as dataset:
        dataset.write(db, 1)
        dataset.set_band_description(1, "simulated_VV_backscatter_dB")
        dataset.update_tags(**tags)

    if preview_path is not None:
        write_backscatter_preview(preview_path, db, valid)

    actual_water_fraction = float(water.mean())
    return {
        "width": width,
        "height": height,
        "crs": "EPSG:4326",
        "bounds": scenario.bbox,
        "units": "dB",
        "polarization": "VV",
        "looks": 4,
        "file_size_bytes": raster_path.stat().st_size if raster_path.exists() else None,
        "target_water_fraction": round(target_water_fraction, 4),
        "synthetic_water_fraction": round(actual_water_fraction, 4),
        "scene_date": date_iso,
        "tags": tags,
        "generator_version": "1.0.0",
        "rng_seed": scenario.seed * 10_007 + scene_index * 97,
        "despeckle": "3x3 median applied during analysis",
        "date_key": date_key,
    }


def generate_scenario_scenes(
    scenario: DemoScenario, raster_dir: Path, media_dir: Path
) -> list[dict]:
    scenes: list[dict] = []
    scenario_raster_dir = raster_dir / scenario.slug
    scenario_media_dir = media_dir / scenario.slug
    for index, (date_iso, fraction) in enumerate(
        zip(scenario.dates, scenario.water_fractions, strict=True)
    ):
        date_token = date_iso[:10]
        raster_path = scenario_raster_dir / f"{date_token}.tif"
        preview_path = scenario_media_dir / f"{date_token}-preview.png"
        metadata = generate_scene(
            scenario,
            date_iso,
            fraction,
            raster_path,
            preview_path,
            scene_index=index,
        )
        metadata["raster_path"] = str(raster_path)
        metadata["preview_path"] = str(preview_path)
        metadata["date_token"] = date_token
        scenes.append(metadata)
    return scenes
