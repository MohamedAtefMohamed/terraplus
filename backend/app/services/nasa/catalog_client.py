"""Generic STAC catalog discovery adapter."""

from __future__ import annotations

import logging

import httpx

from app.core.config import get_settings
from app.services.nasa.base import DiscoveryResult
from app.services.nasa.data_normalizer import normalize_stac_feature

logger = logging.getLogger(__name__)


async def search_stac(
    bbox: list[float],
    start: str | None = None,
    end: str | None = None,
    max_results: int | None = None,
    collections: list[str] | None = None,
) -> DiscoveryResult:
    settings = get_settings()
    if not settings.live_discovery_enabled:
        return DiscoveryResult(
            provider="STAC",
            ok=False,
            error="Live discovery is disabled.",
            endpoint=settings.stac_api_url,
        )

    limit = min(
        max_results or settings.live_search_max_results,
        settings.live_search_max_results,
    )
    payload: dict = {"bbox": bbox, "limit": limit}
    if start and end:
        payload["datetime"] = f"{start}T00:00:00Z/{end}T23:59:59Z"
    elif start:
        payload["datetime"] = f"{start}T00:00:00Z/.."
    elif end:
        payload["datetime"] = f"../{end}T23:59:59Z"
    if collections:
        payload["collections"] = collections

    search_url = settings.stac_api_url.rstrip("/") + "/search"
    headers = {
        "User-Agent": "TerraPulse/1.0 (NASA Space Apps Challenge demonstration)",
        "Accept": "application/geo+json, application/json",
    }
    try:
        async with httpx.AsyncClient(
            timeout=settings.live_search_timeout_seconds, follow_redirects=True
        ) as client:
            response = await client.post(search_url, json=payload, headers=headers)
        if response.status_code >= 400:
            return DiscoveryResult(
                provider="STAC",
                ok=False,
                error=f"STAC search returned HTTP {response.status_code}.",
                endpoint=search_url,
                query=payload,
            )
        body = response.json()
    except Exception as exc:
        logger.warning("STAC discovery failed: %s", exc.__class__.__name__)
        return DiscoveryResult(
            provider="STAC",
            ok=False,
            error="STAC catalog endpoint is unavailable. DEMO data remains unaffected.",
            endpoint=search_url,
            query=payload,
        )

    features = body.get("features") if isinstance(body, dict) else None
    if not isinstance(features, list):
        return DiscoveryResult(
            provider="STAC",
            ok=False,
            error="STAC endpoint returned an unexpected payload.",
            endpoint=search_url,
            query=payload,
        )
    return DiscoveryResult(
        provider="STAC",
        ok=True,
        items=[normalize_stac_feature(feature) for feature in features],
        endpoint=search_url,
        query=payload,
        warning=None if features else "No matching items were returned.",
    )
