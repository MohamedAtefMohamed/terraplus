"""End-to-end paired-scene comparison pipeline."""

from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path

import numpy as np

from app.services.processing.change_detection import detect_backscatter_change
from app.services.processing.geojson import masks_to_geojson, write_geojson
from app.services.processing.preprocessing import (
    AlignmentError,
    check_alignment,
    combined_valid_mask,
    prepare_scene,
)
from app.services.processing.quality_assessment import assess_quality, build_limitations
from app.services.processing.raster_loader import load_raster
from app.services.processing.statistics import build_statistic_rows, compute_statistics
from app.services.processing.visualization import (
    build_change_overlay,
    build_water_overlay,
    write_backscatter_preview,
    write_rgba_png,
)
from app.services.processing.water_change import detect_water_change

SUPPORTED_METHODS = {"water_change", "backscatter_diff"}


class AnalysisError(RuntimeError):
    """Raised for scientifically or technically invalid comparisons."""


@dataclass
class AnalysisOutcome:
    stats: dict
    statistic_rows: list[dict]
    quality: dict
    limitations: list[str]
    summary: str
    interpretation: str
    geojson: dict
    change_overlay_path: Path
    water_overlay_path: Path
    geojson_path: Path
    arrays: dict[str, np.ndarray] = field(default_factory=dict, repr=False)


def _build_narrative(
    stats: dict, quality: dict, before_label: str, after_label: str, is_synthetic: bool
) -> tuple[str, str]:
    changed_pct = stats["changed_fraction"] * 100
    net = stats["net_water_change_km2"]
    if net > 0.05:
        net_sentence = (
            f"The low-backscatter water indicator shows a net gain of {net:.2f} km² "
            f"(gain {stats['water_gain_km2']:.2f} km², loss {stats['water_loss_km2']:.2f} km²)."
        )
    elif net < -0.05:
        net_sentence = (
            f"The low-backscatter water indicator shows a net loss of {abs(net):.2f} km² "
            f"(gain {stats['water_gain_km2']:.2f} km², loss {stats['water_loss_km2']:.2f} km²)."
        )
    else:
        net_sentence = (
            "The low-backscatter water-indicator gain and loss are approximately balanced "
            f"(gain {stats['water_gain_km2']:.2f} km², loss {stats['water_loss_km2']:.2f} km²)."
        )

    dataset_label = "synthetic demonstration scenes" if is_synthetic else "the two observations"
    summary = (
        f"Between {before_label} and {after_label}, {changed_pct:.1f}% of valid pixels in "
        f"{dataset_label} changed by more than ±{stats['threshold_db']:.1f} dB, covering "
        f"{stats['change_area_km2']:.2f} km². {net_sentence} Processing quality is rated "
        f"{quality['label'].lower()} (score {quality['score']:.2f})."
    )
    interpretation = (
        "A darker later observation means less radar energy returned to the sensor. In a wetland "
        "setting this can be consistent with more open water or wet, smooth surfaces, but it can "
        "also result from smoother bare soil, vegetation collapse, radar shadow, or a different "
        "acquisition geometry. A brighter later observation can indicate rougher surfaces, more "
        "woody vegetation, or wetter soil. These patterns are hypotheses for follow-up analysis, "
        "not conclusions about a specific flood or environmental event."
    )
    if is_synthetic:
        interpretation += " This result is computed from generated demonstration data and does not describe a real event."
    return summary, interpretation


def compare_rasters(
    before_path: str | Path,
    after_path: str | Path,
    output_dir: str | Path,
    output_stem: str,
    before_label: str,
    after_label: str,
    change_threshold_db: float = 3.0,
    water_threshold_db: float = -17.0,
    method: str = "water_change",
    is_synthetic: bool = True,
    max_pixels: int = 4_000_000,
    display_bounds: list[float] | None = None,
) -> AnalysisOutcome:
    if method not in SUPPORTED_METHODS:
        raise AnalysisError(f"Unsupported method '{method}'")

    before = load_raster(before_path, max_pixels=max_pixels)
    after = load_raster(after_path, max_pixels=max_pixels)

    alignment = check_alignment(before, after)
    if not alignment.aligned:
        raise AlignmentError(
            "Observations are not spatially aligned on the same grid. " + " ".join(alignment.notes)
        )

    valid = combined_valid_mask(before, after)
    if valid.sum() < 100:
        raise AnalysisError("Too few overlapping valid pixels to produce a meaningful comparison.")

    before_db, _ = prepare_scene(before, despeckle_size=5)
    after_db, _ = prepare_scene(after, despeckle_size=5)

    change = detect_backscatter_change(before_db, after_db, valid, change_threshold_db)
    water = detect_water_change(before_db, after_db, valid, water_threshold_db)
    stats = compute_statistics(
        before, after, change, water, change_threshold_db, water_threshold_db
    )
    quality = assess_quality(
        change.diff_db, valid, alignment, change_threshold_db, stats["valid_coverage"]
    )
    limitations = build_limitations(is_synthetic)
    summary, interpretation = _build_narrative(
        stats, quality, before_label, after_label, is_synthetic
    )

    out = Path(output_dir)
    out.mkdir(parents=True, exist_ok=True)
    change_overlay_path = out / f"{output_stem}-change.png"
    water_overlay_path = out / f"{output_stem}-water.png"
    geojson_path = out / f"{output_stem}-change.geojson"

    write_rgba_png(
        change_overlay_path,
        build_change_overlay(change.increase, change.decrease, valid),
    )
    write_rgba_png(
        water_overlay_path,
        build_water_overlay(water.new_water, water.lost_water, water.persistent_water, valid),
    )

    center_lat = (before.bounds[1] + before.bounds[3]) / 2
    bounds = display_bounds or list(before.bounds)
    geojson = masks_to_geojson(
        layers={
            "new_water": water.new_water,
            "lost_water": water.lost_water,
            "backscatter_increase": change.increase,
            "backscatter_decrease": change.decrease,
        },
        transform=before.transform,
        center_lat=center_lat,
        metadata={
            "before": before_label,
            "after": after_label,
            "method": method,
            "is_synthetic": is_synthetic,
            "change_threshold_db": change_threshold_db,
            "water_threshold_db": water_threshold_db,
            "bounds": bounds,
            "disclaimer": "Derived demonstration layer. Not a flood extent or validated hazard product.",
        },
        tolerance=max(abs(before.transform.a), abs(before.transform.e)) * 0.6,
        min_pixel_area=stats["pixel_area_km2"] * 2,
    )
    write_geojson(geojson_path, geojson)

    # Ensure the preview images exist for API consumers.
    preview_dir = out
    write_backscatter_preview(
        preview_dir / f"{output_stem}-before-preview.png", before.array, before.valid
    )
    write_backscatter_preview(
        preview_dir / f"{output_stem}-after-preview.png", after.array, after.valid
    )

    return AnalysisOutcome(
        stats=stats,
        statistic_rows=build_statistic_rows(stats),
        quality=quality,
        limitations=limitations,
        summary=summary,
        interpretation=interpretation,
        geojson=geojson,
        change_overlay_path=change_overlay_path,
        water_overlay_path=water_overlay_path,
        geojson_path=geojson_path,
        arrays={
            "before_db": before_db,
            "after_db": after_db,
            "diff_db": change.diff_db,
            "valid": valid,
        },
    )


def compare_metrics(
    before_path: str | Path,
    after_path: str | Path,
    change_threshold_db: float = 3.0,
    water_threshold_db: float = -17.0,
    max_pixels: int = 4_000_000,
) -> dict:
    """Compute comparison statistics without writing any derived assets."""
    before = load_raster(before_path, max_pixels=max_pixels)
    after = load_raster(after_path, max_pixels=max_pixels)
    alignment = check_alignment(before, after)
    if not alignment.aligned:
        raise AlignmentError(" ".join(alignment.notes) or "Scenes are not aligned")
    valid = combined_valid_mask(before, after)
    before_db, _ = prepare_scene(before, despeckle_size=5)
    after_db, _ = prepare_scene(after, despeckle_size=5)
    change = detect_backscatter_change(before_db, after_db, valid, change_threshold_db)
    water = detect_water_change(before_db, after_db, valid, water_threshold_db)
    stats = compute_statistics(
        before, after, change, water, change_threshold_db, water_threshold_db
    )
    quality = assess_quality(
        change.diff_db, valid, alignment, change_threshold_db, stats["valid_coverage"]
    )
    return {"stats": stats, "quality": quality}


def inspect_metrics(raster_path: str | Path, water_threshold_db: float = -17.0) -> dict:
    """Quick per-scene metrics used by the timeline view."""
    raster = load_raster(raster_path)
    db, valid = prepare_scene(raster, despeckle_size=5)
    water = valid & (db < water_threshold_db)
    valid_count = max(int(valid.sum()), 1)
    return {
        "mean_db": round(float(np.mean(db[valid])), 2),
        "median_db": round(float(np.median(db[valid])), 2),
        "water_fraction": round(float(water.sum()) / valid_count, 4),
        "valid_coverage": round(float(valid.sum()) / valid.size, 4),
    }
