"""ORM -> API dictionary serializers."""

from __future__ import annotations

from typing import Any

from app.core.paths import resolve_data_path, to_media_url
from app.db.models import Analysis, Location, Observation


def _preview_available(observation: Observation) -> bool:
    if not observation.preview_path:
        return False
    try:
        return resolve_data_path(observation.preview_path).exists()
    except Exception:
        return False


def observation_brief(observation: Observation) -> dict[str, Any]:
    return {
        "id": observation.id,
        "external_id": observation.external_id,
        "acquired_at": observation.acquired_at,
        "mission": observation.mission,
        "polarization": observation.polarization,
        "data_mode": observation.data_mode,
        "is_synthetic": observation.is_synthetic,
        "preview_url": to_media_url(observation.preview_path),
    }


def observation_out(observation: Observation) -> dict[str, Any]:
    location = observation.location
    return {
        **observation_brief(observation),
        "location_id": observation.location_id,
        "location_slug": location.slug if location else None,
        "location_name": location.name if location else None,
        "platform": observation.platform,
        "instrument": observation.instrument,
        "product_type": observation.product_type,
        "acquisition_mode": observation.acquisition_mode,
        "resolution_m": observation.resolution_m,
        "crs": observation.crs,
        "bbox": observation.bbox,
        "source_name": observation.source_name,
        "source_url": observation.source_url,
        "provenance": observation.provenance or {},
        "scene_metadata": observation.scene_metadata or {},
        "preview_available": _preview_available(observation),
        "access_note": (
            None
            if observation.raster_path
            else "Metadata-only record; product download is not enabled in this MVP."
        ),
    }


def analysis_summary(analysis: Analysis) -> dict[str, Any]:
    stats = analysis.stats or {}
    location = analysis.location
    before = analysis.before_observation
    after = analysis.after_observation
    return {
        "id": analysis.id,
        "location_id": analysis.location_id,
        "location_slug": location.slug if location else "",
        "location_name": location.name if location else "",
        "country": location.country if location else "",
        "before_observation_id": analysis.before_observation_id,
        "after_observation_id": analysis.after_observation_id,
        "before_date": before.acquired_at.date().isoformat() if before else "",
        "after_date": after.acquired_at.date().isoformat() if after else "",
        "method": analysis.method,
        "change_threshold_db": analysis.change_threshold_db,
        "water_threshold_db": analysis.water_threshold_db,
        "data_mode": analysis.data_mode,
        "is_synthetic": analysis.is_synthetic,
        "change_area_km2": analysis.change_area_km2,
        "water_gain_km2": analysis.water_gain_km2,
        "water_loss_km2": analysis.water_loss_km2,
        "net_water_change_km2": float(stats.get("net_water_change_km2", 0.0)),
        "changed_fraction": analysis.changed_fraction,
        "confidence_score": analysis.confidence_score,
        "confidence_label": analysis.confidence_label,
        "summary": analysis.summary,
        "bounds": location.bbox if location else [],
        "created_at": analysis.created_at,
        "before_preview_url": to_media_url(before.preview_path) if before else None,
        "after_preview_url": to_media_url(after.preview_path) if after else None,
        "water_overlay_url": to_media_url(analysis.water_overlay_path),
        "change_overlay_url": to_media_url(analysis.change_overlay_path),
    }


def analysis_out(analysis: Analysis) -> dict[str, Any]:
    before = analysis.before_observation
    after = analysis.after_observation
    return {
        **analysis_summary(analysis),
        "status": analysis.status,
        "stats": analysis.stats or {},
        "quality": analysis.quality or {},
        "limitations": analysis.limitations or [],
        "interpretation": analysis.interpretation,
        "geojson_url": f"/api/analysis/{analysis.id}/geojson",
        "before": observation_brief(before) if before else {},
        "after": observation_brief(after) if after else {},
    }


def location_out(location: Location, latest_analysis: Analysis | None = None) -> dict[str, Any]:
    return {
        "id": location.id,
        "slug": location.slug,
        "name": location.name,
        "country": location.country,
        "region": location.region,
        "focus": location.focus,
        "scenario": location.scenario,
        "description": location.description,
        "monitoring_note": location.monitoring_note,
        "center_lat": location.center_lat,
        "center_lon": location.center_lon,
        "bbox": location.bbox,
        "is_demo": location.is_demo,
        "observation_count": len(location.observations),
        "latest_analysis": analysis_summary(latest_analysis) if latest_analysis else None,
    }
