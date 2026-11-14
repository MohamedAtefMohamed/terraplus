"""Live NISAR granule discovery against the ASF DAAC search service.

Returns real granule metadata and the official browse quick-looks hosted on
NASA's Earthdata Cloud. No credentials are required for discovery or for the
browse images.
"""

from __future__ import annotations

import logging
import time
from datetime import UTC, datetime, timedelta
from typing import Any

import httpx

from app.core.config import get_settings

logger = logging.getLogger(__name__)

_CACHE: dict[str, tuple[float, dict[str, Any]]] = {}
_CACHE_TTL_SECONDS = 240
_USER_AGENT = "TerraPulse/1.0 (NASA Space Apps Challenge; live NISAR catalog)"


def _polygon(bbox: list[float]) -> str:
    west, south, east, north = bbox
    return (
        f"POLYGON(({west} {south},{east} {south},{east} {north},"
        f"{west} {north},{west} {south}))"
    )


def _cache_key(bbox: list[float] | None, start: str | None, end: str | None, limit: int) -> str:
    return f"{bbox}|{start}|{end}|{limit}"


def _parse_feature(feature: dict[str, Any]) -> dict[str, Any]:
    props = feature.get("properties") or {}
    browse = props.get("browse") or feature.get("browse") or []
    thumbnail = None
    latlon = None
    for url in browse:
        if not isinstance(url, str):
            continue
        lowered = url.lower()
        if lowered.endswith(".png") and "thumbnail" in lowered:
            thumbnail = url
        elif lowered.endswith(".png"):
            latlon = latlon or url
    geometry = feature.get("geometry") or {}
    coordinates = geometry.get("coordinates") or []
    ring = coordinates[0] if coordinates and isinstance(coordinates[0], list) else []
    if ring and isinstance(ring[0], list) and isinstance(ring[0][0], list):
        # MultiPolygon: flatten to the first ring
        ring = ring[0]
    name = (
        props.get("fileID")
        or props.get("fileName")
        or props.get("granuleName")
        or feature.get("granuleName")
        or feature.get("sceneName")
        or feature.get("id")
        or ""
    )
    if name.endswith(".h5"):
        name = name[:-3]
    product_level = props.get("processingLevel") or feature.get("processingLevel") or ""
    if not product_level and "_L1_" in name:
        product_level = "L1"
    if not ring and coordinates:
        # GeoJSON Polygon coordinates come through as [[[lon, lat], ...]]
        outer = coordinates[0]
        if isinstance(outer, list) and outer and isinstance(outer[0], list):
            ring = outer
    lats = [point[1] for point in ring if len(point) >= 2]
    lons = [point[0] for point in ring if len(point) >= 2]
    center_lat = float(sum(lats) / len(lats)) if lats else None
    center_lon = float(sum(lons) / len(lons)) if lons else None
    polarization = props.get("mainBandPolarization") or feature.get("polarization") or []
    if isinstance(polarization, str):
        polarization = [polarization]
    s3 = props.get("s3Urls") or []
    download_url = (
        f"https://search.asf.alaska.edu/#/?searchType=Listed&granule={name}"
        if name
        else "https://search.asf.alaska.edu/"
    )
    return {
        "id": name,
        "platform": props.get("platform") or feature.get("platform") or "NISAR",
        "sensor": props.get("sensor") or feature.get("sensor") or "L-SAR",
        "product_level": product_level,
        "product_type": props.get("productType")
        or feature.get("productType")
        or (product_level or ("RSLC" if "RSLC" in name else None)),
        "start": props.get("startTime") or feature.get("startTime"),
        "end": props.get("stopTime") or feature.get("stopTime"),
        "flight_direction": props.get("flightDirection") or feature.get("flightDirection"),
        "track": props.get("pathNumber") or feature.get("pathNumber") or feature.get("track"),
        "frame": props.get("frameNumber") or feature.get("frameNumber"),
        "polarization": polarization,
        "center_lat": props.get("centerLat") or center_lat,
        "center_lon": props.get("centerLon") or center_lon,
        "browse_thumbnail": thumbnail,
        "browse_latlon": latlon,
        "download_url": download_url,
        "s3": s3[0] if s3 else None,
        "footprint": ring,
        "source": "ASF DAAC (NASA Earthdata Cloud)",
    }


def recent_nisar(
    bbox: list[float] | None = None,
    days: int = 45,
    limit: int = 40,
) -> dict[str, Any]:
    """Query ASF for NISAR granules. Falls back to a global feed when an AOI has no coverage."""
    settings = get_settings()
    limit = max(1, min(limit, 100))
    days = max(1, min(days, 365))
    end = datetime.now(UTC)
    start = end - timedelta(days=days)
    start_s = start.strftime("%Y-%m-%dT%H:%M:%SZ")
    end_s = end.strftime("%Y-%m-%dT%H:%M:%SZ")

    key = _cache_key(bbox, start_s, end_s, limit)
    now = time.monotonic()
    cached = _CACHE.get(key)
    if cached and now - cached[0] < _CACHE_TTL_SECONDS:
        return cached[1]

    def _search(polygon: list[float] | None) -> tuple[list[dict[str, Any]], str | None]:
        params: dict[str, Any] = {
            "platform": "NISAR",
            "output": "geojson",
            "maxResults": limit,
            "start": start_s,
            "end": end_s,
        }
        if polygon:
            params["intersectsWith"] = _polygon(polygon)
        try:
            with httpx.Client(timeout=25.0, follow_redirects=True) as client:
                response = client.get(
                    settings.asf_search_url,
                    params=params,
                    headers={"User-Agent": _USER_AGENT, "Accept": "application/json"},
                )
            if response.status_code >= 400:
                return [], f"ASF search returned HTTP {response.status_code}."
            payload = response.json()
        except Exception as exc:  # noqa: BLE001
            logger.warning("ASF NISAR search failed: %s", exc.__class__.__name__)
            return [], "Could not reach the ASF search service."

        features = payload.get("features") if isinstance(payload, dict) else None
        if features is None:
            rows = payload
            while isinstance(rows, list) and rows and isinstance(rows[0], list):
                rows = rows[0]
            features = rows if isinstance(rows, list) else None
        if not isinstance(features, list):
            return [], "ASF returned an unexpected payload."
        return [_parse_feature(row) for row in features if isinstance(row, dict)], None

    items, error = _search(bbox)
    scope = "aoi"
    if bbox and not items:
        items, global_error = _search(None)
        error = error or global_error
        scope = "global-fallback"

    items.sort(key=lambda item: item.get("start") or "", reverse=True)
    result = {
        "ok": error is None,
        "error": error,
        "scope": scope,
        "count": len(items),
        "items": items,
        "query": {
            "bbox": bbox,
            "days": days,
            "start": start_s,
            "end": end_s,
            "limit": limit,
        },
        "queried_at": datetime.now(UTC).isoformat(),
        "source": "ASF DAAC search API · browse imagery from NASA Earthdata Cloud",
        "limitations": (
            "NISAR products currently distributed are RSLC (complex L1). Browse quick-looks "
            "are amplitude previews, not calibrated analysis products."
        ),
    }
    _CACHE[key] = (now, result)
    return result


def granule_by_name(name: str) -> dict[str, Any] | None:
    """Fetch one NISAR granule record by name."""
    settings = get_settings()
    try:
        with httpx.Client(timeout=25.0, follow_redirects=True) as client:
            response = client.get(
                settings.asf_search_url,
                params={
                    "platform": "NISAR",
                    "granule_list": name,
                    "output": "geojson",
                    "maxResults": 5,
                },
                headers={"User-Agent": _USER_AGENT, "Accept": "application/json"},
            )
        if response.status_code >= 400:
            return None
        payload = response.json()
    except Exception:  # noqa: BLE001
        return None
    features = payload.get("features") if isinstance(payload, dict) else None
    if not features:
        rows = payload
        while isinstance(rows, list) and rows and isinstance(rows[0], list):
            rows = rows[0]
        features = rows if isinstance(rows, list) else None
    if not features:
        return None
    return _parse_feature(features[0])


def nisar_status() -> dict[str, Any]:
    settings = get_settings()
    return {
        "enabled": True,
        "endpoint": settings.asf_search_url,
        "requires_credentials": False,
        "note": "Granule metadata and browse imagery are public.",
    }