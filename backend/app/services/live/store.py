"""Live-only data assembly.

Every payload in this module comes from a live catalog query or from a change
comparison computed on public Sentinel-1 scenes. Nothing is pre-seeded.
"""

from __future__ import annotations

import hashlib
import json
import threading
import time
from concurrent.futures import ThreadPoolExecutor
from datetime import UTC, datetime
from typing import Any

from app.core.config import get_settings
from app.services.live.areas import AREAS, Area, area_index, get_area
from app.services.live.nisar_live import granule_by_name, recent_nisar
from app.services.live.sentinel1_change import (
    LiveChangeError,
    available_scenes,
    compute_change,
)

REGISTRY_PREFIX = "analysis-"


# ---------------------------------------------------------------------------
# helpers
# ---------------------------------------------------------------------------


def _stable_id(value: str) -> int:
    return int(hashlib.sha1(value.encode()).hexdigest()[:8], 16) % 2_000_000_000 + 1


def _parse_dt(value: str | None) -> datetime:
    if not value:
        return datetime.now(UTC)
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return datetime.now(UTC)


def _ring_bounds(ring: list[list[float]]) -> list[float] | None:
    if not ring:
        return None
    lons = [point[0] for point in ring if len(point) >= 2]
    lats = [point[1] for point in ring if len(point) >= 2]
    if not lons or not lats:
        return None
    return [min(lons), min(lats), max(lons), max(lats)]


def _granule_matches_area(granule: dict[str, Any], area: Area) -> bool:
    bounds = _ring_bounds(granule.get("footprint") or [])
    if not bounds:
        return False
    return not (
        bounds[2] < area.bbox[0]
        or bounds[0] > area.bbox[2]
        or bounds[3] < area.bbox[1]
        or bounds[1] > area.bbox[3]
    )


def _granule_area(granule: dict[str, Any]) -> Area | None:
    for area in AREAS:
        if _granule_matches_area(granule, area):
            return area
    return None


def _observation_id(granule_id: str) -> int:
    return _stable_id(f"nisar:{granule_id}")


def granule_to_observation(granule: dict[str, Any]) -> dict[str, Any]:
    area = _granule_area(granule)
    bounds = _ring_bounds(granule.get("footprint") or []) or [-180.0, -90.0, 180.0, 90.0]
    product = (granule.get("product_type") or granule.get("product_level") or "L1").upper()
    resolution = {"RSLC": 3.0, "GSLC": 5.0, "GCOV": 10.0}.get(product, 10.0)
    polarizations = granule.get("polarization") or []
    polarization = "/".join(polarizations) if polarizations else "L-band"
    return {
        "id": _observation_id(granule["id"]),
        "external_id": granule["id"],
        "acquired_at": _parse_dt(granule.get("start")),
        "mission": "NISAR",
        "polarization": polarization,
        "data_mode": "live",
        "is_synthetic": False,
        "preview_url": granule.get("browse_thumbnail") or granule.get("browse_latlon"),
        "location_id": area_index(area.slug) + 1 if area else 0,
        "location_slug": area.slug if area else None,
        "location_name": area.name if area else None,
        "platform": "NISAR",
        "instrument": granule.get("sensor") or "L-SAR",
        "product_type": product,
        "acquisition_mode": granule.get("flight_direction") or "NISAR",
        "resolution_m": resolution,
        "crs": "EPSG:4326",
        "bbox": bounds,
        "source_name": "ASF DAAC",
        "source_url": granule.get("download_url"),
        "provenance": {
            "catalog": "ASF DAAC search API",
            "granule": granule["id"],
            "flight_direction": granule.get("flight_direction"),
            "track": granule.get("track"),
            "frame": granule.get("frame"),
            "browse": granule.get("browse_latlon"),
        },
        "scene_metadata": {
            "product_level": granule.get("product_level"),
            "product_type": granule.get("product_type"),
            "stop": granule.get("end"),
        },
        "preview_available": bool(granule.get("browse_thumbnail") or granule.get("browse_latlon")),
        "access_note": (
            "Live NISAR catalogue record. Browse imagery is an amplitude quick-look. "
            "Product download requires NASA Earthdata Login."
        ),
    }


# Counting granules per area costs one ASF query per area, which is far too slow
# to do inline. The list renders immediately and a background warm pass fills the
# counts in; clients poll until every area has a value.
_CATALOGUE_LIMIT = 60
_COUNT_TTL = 21600.0  # 6 h: catalogue counts change slowly
_LOCATIONS_TTL = 300.0
_LOCATIONS_CACHE: tuple[float, list[dict[str, Any]]] | None = None
_COUNT_CACHE: dict[str, tuple[float, int, bool]] = {}
_COUNT_LOCK = threading.Lock()
_WARMING = False


def _cached_count(area: Area) -> tuple[int, bool] | None:
    with _COUNT_LOCK:
        hit = _COUNT_CACHE.get(area.slug)
    if hit and time.monotonic() - hit[0] < _COUNT_TTL:
        return hit[1], hit[2]
    return None


def _area_catalogue(area: Area) -> dict[str, Any]:
    """One catalogue query per area, feeding both the count and the thumbnail.

    Counting distinct acquisition days avoids triple-counting RSLC/GSLC/GCOV
    products for the same pass, and it does not saturate for every area.
    """
    try:
        catalogue = recent_nisar(bbox=area.bbox, days=90, limit=_CATALOGUE_LIMIT)
    except Exception:  # noqa: BLE001
        return {"slug": area.slug, "days": None, "capped": False, "thumbnail": None,
                "preview": None, "start": None, "id": None, "product_level": None}
    items = catalogue.get("items", [])
    latest = items[0] if items else None
    days = {item.get("start", "")[:10] for item in items if item.get("start")}
    return {
        "slug": area.slug,
        "days": len(days) if items else 0,
        "capped": len(items) >= _CATALOGUE_LIMIT,
        "thumbnail": (latest.get("browse_thumbnail") or latest.get("browse_latlon")) if latest else None,
        "preview": (latest.get("browse_latlon") or latest.get("browse_thumbnail")) if latest else None,
        "start": latest.get("start") if latest else None,
        "id": latest.get("id") if latest else None,
        "product_level": latest.get("product_level") if latest else None,
    }


def _warm_areas() -> None:
    """Warm counts and browse thumbnails incrementally.

    ASF rate-limits aggressive parallelism, so the pass runs three queries at a
    time and publishes each result as soon as it lands; the UI polls and fills
    in progressively rather than waiting for all fifteen.
    """
    global _WARMING
    with _COUNT_LOCK:
        if _WARMING:
            return
        _WARMING = True
    try:
        from concurrent.futures import as_completed

        with ThreadPoolExecutor(max_workers=3) as pool:
            futures = {pool.submit(_area_catalogue, area): area for area in AREAS}
            for future in as_completed(futures):
                try:
                    row = future.result()
                except Exception:  # noqa: BLE001
                    continue
                stamp = time.monotonic()
                with _COUNT_LOCK:
                    _COUNT_CACHE[row["slug"]] = (stamp, row["days"], row["capped"])
                    known = {item["slug"]: item for item in _THUMB_ROWS}
                    known[row["slug"]] = row
                    _THUMB_ROWS[:] = [known[a.slug] for a in AREAS if a.slug in known]
                    _THUMB_STAMP[0] = stamp
    finally:
        with _COUNT_LOCK:
            _WARMING = False


def _area_location(
    area: Area,
    count: tuple[int, bool] | None,
    latest_analysis: dict | None,
) -> dict[str, Any]:
    nisar_count = count[0] if count else None
    capped = bool(count and count[1])
    return {
        "id": area_index(area.slug) + 1,
        "slug": area.slug,
        "name": area.name,
        "country": area.country,
        "region": area.region,
        "focus": area.focus,
        "category": area.category,
        "scenario": "Live monitoring area",
        "description": area.description,
        "monitoring_note": area.note,
        "center_lat": area.center_lat,
        "center_lon": area.center_lon,
        "bbox": area.bbox,
        "is_demo": False,
        "observation_count": nisar_count,
        "observation_count_capped": capped,
        "latest_analysis": latest_analysis,
    }


# ---------------------------------------------------------------------------
# analysis registry (per-area cache pointer written with every comparison)
# ---------------------------------------------------------------------------


def _registry_path(slug: str):
    settings = get_settings()
    return settings.media_dir / "live" / f"{REGISTRY_PREFIX}{slug}.json"


def _read_registry(slug: str) -> dict[str, Any] | None:
    path = _registry_path(slug)
    if not path.exists():
        return None
    try:
        return json.loads(path.read_text())
    except Exception:  # noqa: BLE001
        return None


def _write_registry(slug: str, summary: dict[str, Any]) -> None:
    path = _registry_path(slug)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(summary, default=str))


def _confidence(valid_fraction: float, gap_days: float) -> tuple[float, str]:
    score = max(0.0, min(1.0, valid_fraction * (1.0 if 3 <= gap_days <= 24 else 0.8)))
    if score >= 0.85:
        label = "high"
    elif score >= 0.6:
        label = "medium"
    else:
        label = "low"
    return round(score, 3), label


def _summary_stats(area: Area, result: dict[str, Any]) -> dict[str, Any]:
    stats = result["stats"]
    valid_area = area.area_km2 * stats["valid_fraction"]
    change_area = valid_area * stats["changed_fraction"]
    gain = valid_area * stats["water_gain_fraction"]
    loss = valid_area * stats["water_loss_fraction"]
    return {
        "area_km2": area.area_km2,
        "valid_area_km2": round(valid_area, 2),
        "change_area_km2": round(change_area, 2),
        "water_gain_km2": round(gain, 2),
        "water_loss_km2": round(loss, 2),
        "net_water_change_km2": round(gain - loss, 2),
        "changed_fraction": stats["changed_fraction"],
        "valid_fraction": stats["valid_fraction"],
    }


def _analysis_summary(area: Area, result: dict[str, Any]) -> dict[str, Any]:
    stats = _summary_stats(area, result)
    confidence, label = _confidence(stats["valid_fraction"], result["gap_days"])
    before = result["before"]
    after = result["after"]
    return {
        "id": _stable_id(f"analysis:{area.slug}"),
        "location_id": area_index(area.slug) + 1,
        "location_slug": area.slug,
        "location_name": area.name,
        "country": area.country,
        "before_observation_id": _stable_id(f"sentinel1:{before['id']}"),
        "after_observation_id": _stable_id(f"sentinel1:{after['id']}"),
        "before_date": before["datetime"][:10],
        "after_date": after["datetime"][:10],
        "method": "sentinel1_backscatter_diff",
        "change_threshold_db": result["method"]["change_threshold_db"],
        "water_threshold_db": result["method"]["water_threshold_db"],
        "data_mode": "live",
        "is_synthetic": False,
        "change_area_km2": stats["change_area_km2"],
        "water_gain_km2": stats["water_gain_km2"],
        "water_loss_km2": stats["water_loss_km2"],
        "net_water_change_km2": stats["net_water_change_km2"],
        "changed_fraction": stats["changed_fraction"],
        "confidence_score": confidence,
        "confidence_label": label,
        "summary": (
            f"{stats['changed_fraction'] * 100:.1f}% of valid pixels changed by more than "
            f"±{result['method']['change_threshold_db']:.1f} dB between "
            f"{before['datetime'][:10]} and {after['datetime'][:10]} "
            f"({result['gap_days']} day gap, same relative orbit)."
        ),
        "bounds": area.bbox,
        "created_at": result.get("computed_at") or datetime.now(UTC).isoformat(),
        "before_preview_url": result["media"]["before"],
        "after_preview_url": result["media"]["after"],
        "water_overlay_url": result["media"]["change"],
        "change_overlay_url": result["media"]["change"],
        "key": result.get("key"),
        "_result": result,
    }


def _public_summary(summary: dict[str, Any]) -> dict[str, Any]:
    return {key: value for key, value in summary.items() if key != "_result"}


def _with_result(area: Area, summary: dict[str, Any], force: bool = False) -> dict[str, Any]:
    """Registry entries store the public summary only; hydrate the pixel result when needed."""
    if "_result" in summary:
        return summary
    key = summary.get("key")
    if key:
        path = get_settings().media_dir / "live" / key / "result.json"
        if path.exists():
            try:
                summary = {**summary, "_result": json.loads(path.read_text())}
                return summary
            except Exception:  # noqa: BLE001
                pass
    fresh = _latest_analysis(area.slug, force=force)
    return fresh or summary


def _analysis_detail(area: Area, summary: dict[str, Any]) -> dict[str, Any]:
    result = summary["_result"]
    stats = _summary_stats(area, result)
    before = result["before"]
    after = result["after"]
    confidence, label = _confidence(stats["valid_fraction"], result["gap_days"])
    analysis_id = summary["id"]
    return {
        **_public_summary(summary),
        "status": "complete",
        "stats": {
            **result["stats"],
            "aoi_area_km2": stats["area_km2"],
            "valid_area_km2": stats["valid_area_km2"],
            "change_area_km2": stats["change_area_km2"],
            "water_gain_km2": stats["water_gain_km2"],
            "water_loss_km2": stats["water_loss_km2"],
            "net_water_change_km2": stats["net_water_change_km2"],
            "valid_coverage": stats["valid_fraction"],
            "changed_fraction": stats["changed_fraction"],
            "difference_noise_db": None,
        },
        "quality": {
            "valid_coverage": stats["valid_fraction"],
            "confidence_score": confidence,
            "confidence_label": label,
            "pair_gap_days": result["gap_days"],
            "same_relative_orbit": True,
        },
        "limitations": [
            "Sentinel-1 C-band backscatter is a proxy; the NISAR L-band products are not analysis-ready yet.",
            "A backscatter change does not identify a cause.",
            "Relative backscatter is used; no absolute radiometric calibration is applied.",
            "The water split uses an Otsu threshold on the pooled dB histogram.",
            "No optical, gauge, or field validation is included.",
        ],
        "interpretation": (
            f"Between {before['datetime'][:10]} and {after['datetime'][:10]} the comparison found "
            f"{stats['changed_fraction'] * 100:.1f}% of valid pixels outside the "
            f"±{result['method']['change_threshold_db']:.1f} dB screen. "
            f"Low-backscatter water indicator gain is {stats['water_gain_km2']:.2f} km2 and loss is "
            f"{stats['water_loss_km2']:.2f} km2. These are screening numbers; wind, soil moisture, "
            "vegetation structure, and viewing geometry can all move radar brightness without a "
            "change in surface water."
        ),
        "geojson_url": f"/api/analysis/{analysis_id}/geojson",
        "geojson": result["geojson"],
        "grid_size": result["grid_size"],
        "gap_days": result["gap_days"],
        "before": {
            "id": _stable_id(f"sentinel1:{before['id']}"),
            "external_id": before["id"],
            "acquired_at": _parse_dt(before["datetime"]),
            "mission": "Sentinel-1",
            "polarization": "VV",
            "data_mode": "live",
            "is_synthetic": False,
            "preview_url": result["media"]["before"],
        },
        "after": {
            "id": _stable_id(f"sentinel1:{after['id']}"),
            "external_id": after["id"],
            "acquired_at": _parse_dt(after["datetime"]),
            "mission": "Sentinel-1",
            "polarization": "VV",
            "data_mode": "live",
            "is_synthetic": False,
            "preview_url": result["media"]["after"],
        },
    }


# ---------------------------------------------------------------------------
# public API used by the routes
# ---------------------------------------------------------------------------


_THUMB_TTL = 21600.0  # 6 h
_THUMB_ROWS: list[dict[str, Any]] = []
_THUMB_STAMP: list[float] = [0.0]


def area_thumbnails() -> list[dict[str, Any]]:
    """Latest browse quick-look per area; filled by the shared warm pass."""
    if _THUMB_ROWS and time.monotonic() - _THUMB_STAMP[0] < _THUMB_TTL:
        return list(_THUMB_ROWS)
    threading.Thread(target=_warm_areas, daemon=True).start()
    return []


def list_locations() -> list[dict[str, Any]]:
    """Return every area immediately; catalogue counts arrive from the warm pass."""
    global _LOCATIONS_CACHE
    now = time.monotonic()
    if _LOCATIONS_CACHE and now - _LOCATIONS_CACHE[0] < _LOCATIONS_TTL:
        return _LOCATIONS_CACHE[1]

    payload = [
        _area_location(area, _cached_count(area), _read_registry(area.slug))
        for area in AREAS
    ]
    if all(row["observation_count"] is not None for row in payload):
        _LOCATIONS_CACHE = (now, payload)
    else:
        threading.Thread(target=_warm_areas, daemon=True).start()
    return payload


def get_location(slug: str) -> dict[str, Any] | None:
    rows = list_locations()
    return next((row for row in rows if row["slug"] == slug), None)


def list_observations(location: str | None = None, limit: int = 100) -> list[dict[str, Any]]:
    limit = max(1, min(limit, 300))
    if location:
        area = get_area(location)
        if area is None:
            return []
        catalogue = recent_nisar(bbox=area.bbox, days=365, limit=limit)
    else:
        catalogue = recent_nisar(days=365, limit=limit)
    return [granule_to_observation(item) for item in catalogue.get("items", [])]


def get_observation(observation_id: int) -> dict[str, Any] | None:
    for granule in recent_nisar(days=365, limit=100).get("items", []):
        if _observation_id(granule["id"]) == observation_id:
            return granule_to_observation(granule)
    return None


def get_observation_by_external_id(external_id: str) -> dict[str, Any] | None:
    granule = granule_by_name(external_id)
    if granule is None:
        return None
    return granule_to_observation(granule)


def _latest_analysis(slug: str, force: bool = False) -> dict[str, Any] | None:
    area = get_area(slug)
    if area is None:
        return None
    settings = get_settings()
    try:
        result = compute_change(
            area.bbox,
            days=180,
            threshold_db=settings.default_change_threshold_db,
            grid_size=settings.live_change_grid_size,
            force=force,
        )
    except LiveChangeError:
        return None
    summary = _analysis_summary(area, result)
    _write_registry(slug, _public_summary(summary))
    return summary


def list_analyses(location: str | None = None) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    for area in AREAS:
        if location and area.slug != location:
            continue
        summary = _read_registry(area.slug)
        if summary:
            rows.append(summary)
    return rows


def get_analysis(analysis_id: int, force: bool = False) -> dict[str, Any] | None:
    for area in AREAS:
        if _stable_id(f"analysis:{area.slug}") != analysis_id:
            continue
        summary = _latest_analysis(area.slug, force=force)
        if summary is None:
            return None
        return _analysis_detail(area, summary)
    return None


def get_explanation(analysis_id: int) -> dict[str, Any] | None:
    for area in AREAS:
        if _stable_id(f"analysis:{area.slug}") != analysis_id:
            continue
        summary = _read_registry(area.slug)
        if summary is None:
            summary = _latest_analysis(area.slug)
        if summary is None:
            return None
        detail = _analysis_detail(area, _with_result(area, summary))
        stats = detail["stats"]
        before = detail["before"]["acquired_at"].date().isoformat()
        after = detail["after"]["acquired_at"].date().isoformat()
        net = stats["net_water_change_km2"]
        direction = "expanded" if net > 0.05 else "contracted" if net < -0.05 else "balanced"
        return {
            "mode": "live",
            "engine": "deterministic",
            "headline": (
                f"Low-backscatter water indicator {direction} by {abs(net):.2f} km2 "
                f"between {before} and {after}"
            ),
            "summary": (
                f"Two Sentinel-1 passes over {area.name} were compared on the same relative "
                f"orbit with a {detail['quality']['pair_gap_days']} day gap. "
                f"Valid overlap covers {stats['valid_coverage'] * 100:.1f}% of the area."
            ),
            "observations": [
                f"Earlier scene {before}: Sentinel-1 GRD VV.",
                f"Later scene {after}: Sentinel-1 GRD VV.",
                f"Changed pixels above the ±{detail['change_threshold_db']:.1f} dB screen: "
                f"{stats['changed_fraction'] * 100:.1f}% of valid pixels "
                f"({stats['change_area_km2']:.2f} km2).",
                f"Water-indicator threshold: {detail['water_threshold_db']:.1f} dB (Otsu).",
                f"Water-indicator gain {stats['water_gain_km2']:.2f} km2; "
                f"loss {stats['water_loss_km2']:.2f} km2.",
            ],
            "interpretation": detail["interpretation"],
            "environmental_relevance": (
                "In a delta or wetland, low-backscatter change often tracks open water, wet soil, "
                "or vegetation structure. Radar brightness alone cannot separate those causes."
            ),
            "technical_indicators": [
                {"label": "Valid coverage", "value": round(stats["valid_coverage"] * 100, 1), "unit": "%"},
                {"label": "Changed area", "value": stats["change_area_km2"], "unit": "km2"},
                {"label": "Net water indicator", "value": net, "unit": "km2"},
                {"label": "Confidence", "value": detail["confidence_score"], "unit": ""},
            ],
            "confidence": {
                "score": detail["confidence_score"],
                "label": detail["confidence_label"],
                "important": "Based on overlap coverage and pair spacing, not event probability.",
            },
            "method": {
                "sensor": "Sentinel-1 GRD VV",
                "grid": f"{detail['grid_size']} × {detail['grid_size']} px EPSG:4326",
                "speckle": "3 × 3 median screen",
                "change_threshold_db": detail["change_threshold_db"],
                "water_threshold_db": detail["water_threshold_db"],
            },
            "analysis_period": {"start": before, "end": after, "days": detail["gap_days"]},
            "source_data": [
                {"name": "Earth Search STAC", "url": "https://earth-search.aws.element84.com/v1"},
                {"name": "AWS Open Data sentinel-s1-l1c", "url": "https://registry.opendata.aws/sentinel-1/"},
                {"name": "ASF DAAC NISAR catalogue", "url": "https://search.asf.alaska.edu/"},
            ],
            "uncertainty": [
                "No atmospheric correction or incidence-angle normalisation.",
                "Relative backscatter; calibration constants are not applied.",
                "Water masks are a screening aid, not a flood extent.",
            ],
            "limitations": detail["limitations"],
            "sources": [
                {"label": "Sentinel-1 GRD via Earth Search", "url": "https://earth-search.aws.element84.com/v1"},
                {"label": "NISAR catalogue via ASF", "url": "https://search.asf.alaska.edu/"},
            ],
            "disclaimer": "Screening signal. Not an operational, emergency, or safety product.",
            "note": "Computed on demand from public scenes and cached for six hours.",
        }
    return None


def compare_for_location(
    location: str, days: int = 180, threshold_db: float = 3.0
) -> dict[str, Any] | None:
    area = get_area(location)
    if area is None:
        return None
    settings = get_settings()
    try:
        result = compute_change(
            area.bbox,
            days=days,
            threshold_db=threshold_db,
            grid_size=settings.live_change_grid_size,
        )
    except LiveChangeError:
        return None
    summary = _analysis_summary(area, result)
    _write_registry(area.slug, _public_summary(summary))
    return _analysis_detail(area, summary)


def dashboard_payload() -> dict[str, Any]:
    settings = get_settings()
    global_catalogue = recent_nisar(days=30, limit=100)
    locations = list_locations()
    analyses = list_analyses()
    observations = [
        granule_to_observation(item) for item in global_catalogue.get("items", [])[:8]
    ]
    total_area = round(sum(area.area_km2 for area in AREAS), 1)
    change_area = round(sum(item["change_area_km2"] for item in analyses), 2)
    gain = round(sum(item["water_gain_km2"] for item in analyses), 2)
    loss = round(sum(item["water_loss_km2"] for item in analyses), 2)
    confidence = (
        round(sum(item["confidence_score"] for item in analyses) / len(analyses), 3)
        if analyses
        else 0.0
    )
    indicators = [
        {
            "location_slug": item["location_slug"],
            "location_name": item["location_name"],
            "label": "Net water-indicator change",
            "value": item["net_water_change_km2"],
            "unit": "km2",
            "period": f"{item['before_date']} to {item['after_date']}",
            "confidence": item["confidence_label"],
            "direction": "gain" if item["net_water_change_km2"] >= 0 else "loss",
            "data_mode": "live",
            "is_synthetic": False,
        }
        for item in analyses
    ]
    return {
        "generated_at": datetime.now(UTC),
        "data_status": {
            "requested_mode": "live",
            "effective_mode": "live",
            "analysis_mode": "live",
            "label": "LIVE DATA",
            "is_synthetic": False,
            "fallback_reason": None,
            "sample": {"available": False, "observation_count": 0, "note": "No sample data.", "source": None},
            "live": {
                "enabled": True,
                "earthdata_credentials_configured": settings.has_earthdata_credentials,
                "download_supported": False,
                "note": (
                    "NISAR catalogue discovery and browse imagery run without credentials. "
                    "Pixel change uses public Sentinel-1 GRD scenes."
                ),
            },
            "data_source_count": 4,
        },
        "stats": {
            "locations": len(AREAS),
            "observations": global_catalogue.get("count", 0),
            "analyses": len(analyses),
            "demo_area_monitored_km2": total_area,
            "area_in_latest_analyses_km2": total_area,
            "latest_change_area_km2": change_area,
            "latest_water_gain_km2": gain,
            "latest_water_loss_km2": loss,
            "average_confidence": confidence,
        },
        "locations": locations,
        "recent_analyses": analyses,
        "recent_observations": observations,
        "environmental_indicators": indicators,
        "nisar": {
            "mission": {
                "name": "NASA-ISRO Synthetic Aperture Radar (NISAR)",
                "url": "https://science.nasa.gov/mission/nisar/",
            },
            "discovery": {
                "enabled": True,
                "earthdata_credentials_configured": settings.has_earthdata_credentials,
                "download_supported": False,
                "processing_supported": False,
                "note": "Catalogue and browse imagery are live. NISAR L-band pixel processing is not public yet.",
            },
        },
        "notes": [
            "Catalogue counts come from the ASF DAAC search API and refresh on a short cache.",
            "Change summaries appear after a comparison runs in the live lab.",
            "Sentinel-1 C-band is used for pixel change until NISAR L-band products are analysis-ready.",
        ],
    }


def layers_payload() -> dict[str, Any]:
    return {
        "mode": "live",
        "disclaimer": (
            "NISAR footprints and monitoring areas are real catalog metadata. Change overlays "
            "appear after a Sentinel-1 comparison runs; they are screening layers, not flood maps."
        ),
        "layers": [
            {
                "key": "radar_observations",
                "name": "NISAR acquisitions",
                "kind": "footprints",
                "color": "#4de3f7",
                "description": "Live NISAR granule footprints from the ASF catalogue.",
                "available": True,
                "data_mode": "live",
                "legend": [{"label": "NISAR granule footprint", "color": "#4de3f7"}],
            },
            {
                "key": "detected_changes",
                "name": "Detected changes",
                "kind": "raster",
                "color": "#2dd4bf",
                "description": "Backscatter change beyond the ± dB threshold from a live Sentinel-1 comparison.",
                "available": True,
                "data_mode": "live",
                "legend": [
                    {"label": "Backscatter increase", "color": "#2dd4bf"},
                    {"label": "Backscatter decrease", "color": "#fb923c"},
                ],
            },
            {
                "key": "water_change",
                "name": "Water-related change",
                "kind": "raster",
                "color": "#38bdf8",
                "description": "Low-backscatter water indicator gain and loss from live Sentinel-1 scenes.",
                "available": True,
                "data_mode": "live",
                "legend": [
                    {"label": "Water indicator gain", "color": "#38bdf8"},
                    {"label": "Water indicator loss", "color": "#fb923c"},
                ],
            },
            {
                "key": "wetland_monitoring",
                "name": "Monitoring areas",
                "kind": "aoi",
                "color": "#34d399",
                "description": "Real bounding boxes used for catalogue queries and comparisons.",
                "available": True,
                "data_mode": "live",
                "legend": [{"label": "Monitoring area", "color": "#34d399"}],
            },
        ],
    }


def timeline_payload(slug: str) -> dict[str, Any] | None:
    area = get_area(slug)
    if area is None:
        return None
    scenes = available_scenes(area.bbox, days=180)
    catalogue = recent_nisar(bbox=area.bbox, days=180, limit=50)  # noqa: E501
    observations = []
    previous: datetime | None = None
    for scene in sorted(scenes.get("items", []), key=lambda item: item["datetime"]):
        acquired = _parse_dt(scene["datetime"])
        observations.append(
            {
                "id": _stable_id(f"sentinel1:{scene['id']}"),
                "external_id": scene["id"],
                "acquired_at": acquired,
                "date": acquired.date().isoformat(),
                "mission": "Sentinel-1",
                "polarization": "/".join(scene.get("polarizations") or ["VV"]),
                "product_type": "GRD",
                "data_mode": "live",
                "is_synthetic": False,
                "preview_url": None,
                "days_since_previous": (acquired - previous).days if previous else None,
                "metrics": {
                    "relative_orbit": scene.get("relative_orbit"),
                    "orbit_state": scene.get("orbit_state"),
                },
                "status": "catalogued",
                "error": None,
            }
        )
        previous = acquired
    comparisons = []
    summary = _read_registry(slug)
    if summary:
        comparisons.append(
            {
                "before_id": summary["before_observation_id"],
                "after_id": summary["after_observation_id"],
                "before_date": summary["before_date"],
                "after_date": summary["after_date"],
                "change_area_km2": summary["change_area_km2"],
                "water_gain_km2": summary["water_gain_km2"],
                "water_loss_km2": summary["water_loss_km2"],
                "net_water_change_km2": summary["net_water_change_km2"],
                "water_before_fraction": None,
                "water_after_fraction": None,
                "change_threshold_db": summary["change_threshold_db"],
                "water_threshold_db": summary["water_threshold_db"],
            }
        )
    return {
        "location": _area_location(
            area, (catalogue.get("count", 0), False), summary
        ),
        "observations": observations,
        "comparisons": comparisons,
        "trend_summary": (
            f"{scenes.get('count', 0)} Sentinel-1 scenes and "
            f"{catalogue.get('count', 0)} NISAR catalogue records intersect this area in the last 180 days."
        ),
        "data_mode": "live",
        "is_synthetic": False,
        "generated_at": datetime.now(UTC),
        "nisar": catalogue.get("items", [])[:12],
    }


def data_sources_payload() -> dict[str, Any]:
    return {
        "sources": [
            {
                "name": "ASF DAAC search API",
                "role": "NISAR catalogue and browse imagery",
                "url": "https://search.asf.alaska.edu/",
                "available": True,
                "requires_credentials": False,
            },
            {
                "name": "Element 84 Earth Search",
                "role": "Sentinel-1 GRD STAC index",
                "url": "https://earth-search.aws.element84.com/v1",
                "available": True,
                "requires_credentials": False,
            },
            {
                "name": "AWS Open Data sentinel-s1-l1c",
                "role": "Cloud-optimized GRD scene storage",
                "url": "https://registry.opendata.aws/sentinel-1/",
                "available": True,
                "requires_credentials": False,
            },
            {
                "name": "NASA GIBS",
                "role": "Daily MODIS Terra optical basemap",
                "url": "https://gibs.earthdata.nasa.gov/",
                "available": True,
                "requires_credentials": False,
            },
        ],
        "mode": "live",
    }