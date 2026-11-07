"""ASF DAAC granule discovery adapter (metadata only)."""

from __future__ import annotations

import logging
from typing import Any

import httpx

from app.core.config import get_settings
from app.services.nasa.base import DiscoveryResult
from app.services.nasa.data_normalizer import normalize_asf_feature

logger = logging.getLogger(__name__)


def _bbox_polygon(bbox: list[float]) -> str:
    west, south, east, north = bbox
    return f"POLYGON(({west} {south},{east} {south},{east} {north},{west} {north},{west} {south}))"


async def search_asf(
    bbox: list[float],
    start: str | None = None,
    end: str | None = None,
    max_results: int | None = None,
    platform: str = "NISAR",
) -> DiscoveryResult:
    settings = get_settings()
    if not settings.live_discovery_enabled:
        return DiscoveryResult(
            provider="ASF",
            ok=False,
            error="Live discovery is disabled. Set LIVE_DISCOVERY_ENABLED=true to enable it.",
            endpoint=settings.asf_search_url,
        )

    if not (len(bbox) == 4 and bbox[0] < bbox[2] and bbox[1] < bbox[3]):
        return DiscoveryResult(
            provider="ASF",
            ok=False,
            error="Invalid bounding box. Expected [west, south, east, north].",
            endpoint=settings.asf_search_url,
        )

    limit = min(
        max_results or settings.live_search_max_results,
        settings.live_search_max_results,
    )
    params: dict[str, Any] = {
        "platform": platform,
        "intersectsWith": _bbox_polygon(bbox),
        "output": "geojson",
        "maxResults": limit,
    }
    if start:
        params["start"] = start
    if end:
        params["end"] = end

    headers = {
        "User-Agent": "TerraPulse/1.0 (NASA Space Apps Challenge demonstration)",
        "Accept": "application/json",
    }
    query_summary = {
        "platform": platform,
        "bbox": bbox,
        "start": start,
        "end": end,
        "max_results": limit,
    }

    try:
        async with httpx.AsyncClient(
            timeout=settings.live_search_timeout_seconds, follow_redirects=True
        ) as client:
            response = await client.get(settings.asf_search_url, params=params, headers=headers)
        if response.status_code >= 400:
            return DiscoveryResult(
                provider="ASF",
                ok=False,
                error=f"ASF search returned HTTP {response.status_code}. Metadata discovery is unavailable right now.",
                endpoint=settings.asf_search_url,
                query=query_summary,
            )
        payload = response.json()
    except httpx.TimeoutException:
        return DiscoveryResult(
            provider="ASF",
            ok=False,
            error="ASF search timed out. The application remains in DEMO mode.",
            endpoint=settings.asf_search_url,
            query=query_summary,
        )
    except Exception as exc:  # network / JSON / unexpected payload
        logger.warning("ASF discovery failed: %s", exc.__class__.__name__)
        return DiscoveryResult(
            provider="ASF",
            ok=False,
            error=(
                "Could not reach the ASF search service. Check network access, or continue "
                "with the fully functional DEMO dataset."
            ),
            endpoint=settings.asf_search_url,
            query=query_summary,
        )

    features = payload.get("features") if isinstance(payload, dict) else None
    if not isinstance(features, list):
        return DiscoveryResult(
            provider="ASF",
            ok=False,
            error="ASF returned an unexpected metadata payload.",
            endpoint=settings.asf_search_url,
            query=query_summary,
        )

    items = [normalize_asf_feature(feature) for feature in features]
    warning = None
    if not items:
        warning = (
            "No matching NISAR granule metadata was returned for this area and date range. "
            "This does not mean the mission has no data; coverage and latency vary."
        )
    return DiscoveryResult(
        provider="ASF",
        ok=True,
        items=items,
        warning=warning,
        endpoint=settings.asf_search_url,
        query=query_summary,
    )
