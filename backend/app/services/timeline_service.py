"""Temporal analysis for one demonstration area."""

from __future__ import annotations

from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.core.config import get_settings
from app.core.paths import resolve_data_path, to_media_url
from app.db.models import Location
from app.services.processing.pipeline import compare_metrics, inspect_metrics
from app.services.serialization import location_out


class TimelineError(RuntimeError):
    pass


def build_timeline(db: Session, slug: str) -> dict:
    settings = get_settings()
    location = db.scalar(
        select(Location).options(selectinload(Location.observations)).where(Location.slug == slug)
    )
    if location is None:
        raise TimelineError("Location not found")
    observations = sorted(location.observations, key=lambda item: item.acquired_at)
    if not observations:
        raise TimelineError("No observations are available for this location")

    obs_payload: list[dict] = []
    metrics_by_id: dict[int, dict] = {}
    previous_date: datetime | None = None
    for observation in observations:
        metrics = None
        error = None
        try:
            path = resolve_data_path(observation.raster_path)
            metrics = inspect_metrics(path, settings.default_water_threshold_db)
            metrics["water_fraction"] = round(metrics["water_fraction"] * 100, 2)
        except Exception as exc:
            error = f"Metrics unavailable ({exc.__class__.__name__})"
        if metrics:
            metrics_by_id[observation.id] = metrics
        obs_payload.append(
            {
                "id": observation.id,
                "external_id": observation.external_id,
                "acquired_at": observation.acquired_at,
                "date": observation.acquired_at.date().isoformat(),
                "mission": observation.mission,
                "polarization": observation.polarization,
                "product_type": observation.product_type,
                "data_mode": observation.data_mode,
                "is_synthetic": observation.is_synthetic,
                "preview_url": to_media_url(observation.preview_path),
                "days_since_previous": (
                    (observation.acquired_at - previous_date).days if previous_date else None
                ),
                "metrics": metrics,
                "status": "available" if metrics else "unavailable",
                "error": error,
            }
        )
        previous_date = observation.acquired_at

    comparisons: list[dict] = []
    for before, after in zip(observations[:-1], observations[1:], strict=True):
        try:
            result = compare_metrics(
                resolve_data_path(before.raster_path),
                resolve_data_path(after.raster_path),
                settings.default_change_threshold_db,
                settings.default_water_threshold_db,
                settings.max_analysis_pixels,
            )
            stats = result["stats"]
            comparisons.append(
                {
                    "before_id": before.id,
                    "after_id": after.id,
                    "before_date": before.acquired_at.date().isoformat(),
                    "after_date": after.acquired_at.date().isoformat(),
                    "change_area_km2": stats["change_area_km2"],
                    "water_gain_km2": stats["water_gain_km2"],
                    "water_loss_km2": stats["water_loss_km2"],
                    "net_water_change_km2": stats["net_water_change_km2"],
                    "water_before_fraction": stats["water_before_fraction"] * 100,
                    "water_after_fraction": stats["water_after_fraction"] * 100,
                    "mean_change_db": stats["mean_change_db"],
                    "confidence": result["quality"]["label"],
                    "status": "completed",
                }
            )
        except Exception as exc:
            comparisons.append(
                {
                    "before_id": before.id,
                    "after_id": after.id,
                    "before_date": before.acquired_at.date().isoformat(),
                    "after_date": after.acquired_at.date().isoformat(),
                    "status": "error",
                    "error": f"Comparison unavailable ({exc.__class__.__name__})",
                }
            )

    water_values = [
        item["metrics"]["water_fraction"]
        for item in obs_payload
        if item["metrics"] and item["metrics"].get("water_fraction") is not None
    ]
    if len(water_values) >= 2:
        first, last = water_values[0], water_values[-1]
        peak = max(water_values)
        all_synthetic = all(item.is_synthetic for item in observations)
        caveat = (
            "These are synthetic demonstration scenes; the trajectory is illustrative, not a "
            "measured environmental record."
            if all_synthetic
            else "The trajectory is derived from the staged observation set and remains subject to the stated limitations."
        )
        trend_summary = (
            f"The low-backscatter water indicator moves from {first:.1f}% in the first "
            f"observation to {last:.1f}% in the latest, peaking at {peak:.1f}%. {caveat}"
        )
    else:
        trend_summary = "Insufficient valid observations to describe a trend for this area."

    return {
        "location": location_out(location),
        "observations": obs_payload,
        "comparisons": comparisons,
        "trend_summary": trend_summary,
        "data_mode": "demo" if observations[0].is_synthetic else observations[0].data_mode,
        "is_synthetic": all(item.is_synthetic for item in observations),
        "generated_at": datetime.now(UTC),
    }
