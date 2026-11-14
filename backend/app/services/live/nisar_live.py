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
    browse = feature.get("browse") or []
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
    name = feature.get("granuleName") or feature.get("sceneName") or ""
    product_level = feature.get("processingLevel") or ""
    if not product_level and "_L1_" in name:
        product_level = "L1"
    return {
        "id": name,
        "platform": feature.get("platform") or "NISAR",
        "sensor": feature.get("sensor") or "L-SAR",
        "product_level": product_level,
        "product_type": feature.get("productType") or ("RSLC" if "RSLC" in name else None),
        "start": feature.get("startTime"),
        "end": feature.get("stopTime"),
        "flight_direction": feature.get("flightDirection"),
        "track": feature.get("pathNumber") or feature.get("track"),
        "frame": feature.get("frameNumber"),
        "polarization": feature.get("polarization") or [],
        "center_lat": feature.get("centerLat"),
        "center_lon": feature.get("centerLon"),
        "browse_thumbnail": thumbnail,
        "browse_latlon": latlon,
        "download_url": feature.get("downloadUrl"),
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
            "output": "json",
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

        rows = payload
        while isinstance(rows, list) and rows and isinstance(rows[0], list):
            rows = rows[0]
        if not isinstance(rows, list):
            return [], "ASF returned an unexpected payload."
        return [_parse_feature(row) for row in rows if isinstance(row, dict)], None

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


def nisar_status() -> dict[str, Any]:
    settings = get_settings()
    return {
        "enabled": True,
        "endpoint": settings.asf_search_url,
        "requires_credentials": False,
        "note": "Granule metadata and browse imagery are public.",
    }