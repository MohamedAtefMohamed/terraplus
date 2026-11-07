"""Spatial statistics for a paired-scene change analysis."""

from __future__ import annotations

import math
from typing import Any

import numpy as np

from app.services.processing.change_detection import ChangeMasks
from app.services.processing.raster_loader import RasterData
from app.services.processing.water_change import WaterChangeMasks

KM_PER_DEGREE_LAT = 110.574
KM_PER_DEGREE_LON_AT_EQUATOR = 111.320


def pixel_area_km2(transform: Any, center_lat: float) -> float:
    width_km = abs(transform.a) * KM_PER_DEGREE_LON_AT_EQUATOR * math.cos(math.radians(center_lat))
    height_km = abs(transform.e) * KM_PER_DEGREE_LAT
    return float(width_km * height_km)


def _area(pixel_count: int, pixel_area: float) -> float:
    return round(float(pixel_count) * pixel_area, 4)


def compute_statistics(
    before: RasterData,
    after: RasterData,
    change: ChangeMasks,
    water: WaterChangeMasks,
    threshold_db: float,
    water_threshold_db: float,
) -> dict[str, Any]:
    valid = change.valid
    total_pixels = int(valid.size)
    valid_pixels = int(valid.sum())
    center_lat = (before.bounds[1] + before.bounds[3]) / 2
    pixel_km2 = pixel_area_km2(before.transform, center_lat)

    changed = change.increase | change.decrease
    stats: dict[str, Any] = {
        "valid_pixels": valid_pixels,
        "total_pixels": total_pixels,
        "valid_coverage": round(valid_pixels / max(total_pixels, 1), 4),
        "aoi_area_km2": _area(total_pixels, pixel_km2),
        "pixel_area_km2": round(pixel_km2, 8),
        "changed_pixels": int(changed.sum()),
        "changed_fraction": round(float(changed.sum()) / max(valid_pixels, 1), 4),
        "change_area_km2": _area(int(changed.sum()), pixel_km2),
        "increase_pixels": int(change.increase.sum()),
        "decrease_pixels": int(change.decrease.sum()),
        "increase_area_km2": _area(int(change.increase.sum()), pixel_km2),
        "decrease_area_km2": _area(int(change.decrease.sum()), pixel_km2),
        "water_before_pixels": int(water.water_before.sum()),
        "water_after_pixels": int(water.water_after.sum()),
        "water_before_fraction": round(float(water.water_before.sum()) / max(valid_pixels, 1), 4),
        "water_after_fraction": round(float(water.water_after.sum()) / max(valid_pixels, 1), 4),
        "water_before_km2": _area(int(water.water_before.sum()), pixel_km2),
        "water_after_km2": _area(int(water.water_after.sum()), pixel_km2),
        "water_gain_pixels": int(water.new_water.sum()),
        "water_loss_pixels": int(water.lost_water.sum()),
        "water_gain_km2": _area(int(water.new_water.sum()), pixel_km2),
        "water_loss_km2": _area(int(water.lost_water.sum()), pixel_km2),
        "persistent_water_km2": _area(int(water.persistent_water.sum()), pixel_km2),
        "net_water_change_km2": _area(
            int(water.new_water.sum()) - int(water.lost_water.sum()), pixel_km2
        ),
        "mean_before_db": round(float(np.mean(before.array[valid])), 2),
        "mean_after_db": round(float(np.mean(after.array[valid])), 2),
        "mean_change_db": round(float(np.mean(change.diff_db[valid])), 3),
        "median_change_db": round(float(np.median(change.diff_db[valid])), 3),
        "threshold_db": float(threshold_db),
        "water_threshold_db": float(water_threshold_db),
        "center_lat": round(center_lat, 5),
        "center_lon": round((before.bounds[0] + before.bounds[2]) / 2, 5),
    }
    return stats


def build_statistic_rows(stats: dict[str, Any]) -> list[dict[str, Any]]:
    """Convert the stats dictionary into display-ready records."""
    definitions = [
        (
            "change_area_km2",
            "Changed area",
            "km²",
            "change",
            "Area exceeding the configured backscatter change threshold. Not a flood extent.",
        ),
        (
            "changed_fraction",
            "Changed share of valid pixels",
            "%",
            "change",
            "Share of valid pixels classified as increase or decrease.",
        ),
        (
            "water_gain_km2",
            "Water-indicator gain",
            "km²",
            "water",
            "Area that crossed below the low-backscatter water threshold between observations.",
        ),
        (
            "water_loss_km2",
            "Water-indicator loss",
            "km²",
            "water",
            "Area that crossed above the water threshold between observations.",
        ),
        (
            "water_before_fraction",
            "Water indicator, earlier scene",
            "%",
            "water",
            "Low-backscatter fraction in the earlier observation.",
        ),
        (
            "water_after_fraction",
            "Water indicator, later scene",
            "%",
            "water",
            "Low-backscatter fraction in the later observation.",
        ),
        (
            "increase_area_km2",
            "Backscatter increase",
            "km²",
            "change",
            "Area where the later scene was brighter than the threshold.",
        ),
        (
            "decrease_area_km2",
            "Backscatter decrease",
            "km²",
            "change",
            "Area where the later scene was darker than the threshold.",
        ),
        (
            "mean_change_db",
            "Mean change",
            "dB",
            "radiometry",
            "Mean of the per-pixel difference (later minus earlier) in decibels.",
        ),
        (
            "median_change_db",
            "Median change",
            "dB",
            "radiometry",
            "Median of the per-pixel difference; robust to outliers.",
        ),
        (
            "valid_pixels",
            "Valid comparison pixels",
            "px",
            "quality",
            "Pixels valid in both observations and used in the comparison.",
        ),
        (
            "valid_coverage",
            "Valid coverage",
            "%",
            "quality",
            "Share of the analysis grid with valid data in both scenes.",
        ),
        (
            "aoi_area_km2",
            "Analysis footprint",
            "km²",
            "quality",
            "Full grid area of the demonstration footprint.",
        ),
        (
            "mean_before_db",
            "Mean backscatter, earlier",
            "dB",
            "radiometry",
            "Mean valid backscatter in the earlier observation.",
        ),
        (
            "mean_after_db",
            "Mean backscatter, later",
            "dB",
            "radiometry",
            "Mean valid backscatter in the later observation.",
        ),
        (
            "persistent_water_km2",
            "Persistent water indicator",
            "km²",
            "water",
            "Low-backscatter area present in both observations.",
        ),
    ]
    rows: list[dict[str, Any]] = []
    for key, label, unit, category, description in definitions:
        value = stats.get(key)
        if key in {
            "changed_fraction",
            "water_before_fraction",
            "water_after_fraction",
            "valid_coverage",
        }:
            value = round(float(value) * 100, 2) if value is not None else None
        rows.append(
            {
                "key": key,
                "label": label,
                "value": float(value) if value is not None else None,
                "unit": unit,
                "category": category,
                "description": description,
            }
        )
    return rows
