"""NISAR integration facade.

Status of this MVP: live *discovery* of NISAR granule metadata is implemented
through ASF (with a generic STAC fallback). Authenticated product download,
calibration and interferometric processing are intentionally out of scope and
are surfaced as such by the API. No discovered granule is presented as processed.
"""

from __future__ import annotations

from typing import Any

from app.core.config import get_settings
from app.services.nasa.asf_client import search_asf
from app.services.nasa.base import DiscoveryResult
from app.services.nasa.catalog_client import search_stac

MISSION_FACTS = {
    "name": "NASA-ISRO Synthetic Aperture Radar (NISAR)",
    "agencies": ["NASA", "ISRO"],
    "status": "Launched 2025; joint NASA-ISRO Earth observation mission.",
    "bands": "L-band (NASA) and S-band (ISRO) synthetic aperture radar.",
    "repeat_cycle_days": 12,
    "primary_applications": [
        "Solid Earth deformation and earthquakes",
        "Ice sheet and glacier motion",
        "Ecosystems and biomass",
        "Water resources, wetlands and floods",
        "Agriculture and land surface change",
    ],
    "url": "https://science.nasa.gov/mission/nisar/",
    "note": (
        "Mission facts are included for context. TerraPulse does not bundle NISAR "
        "pixels; the demonstration scenes are synthetic."
    ),
}

# Product families commonly referenced in NISAR documentation. Product schemas
# evolve; the app treats these as descriptive metadata, not a hard parser contract.
PRODUCT_FAMILIES = [
    {
        "id": "RSLC",
        "name": "Range Doppler Single Look Complex",
        "level": "L1",
        "use": "Complex SAR imagery for advanced interferometric and polarimetric processing.",
        "supported_in_mvp": False,
        "note": "Requires mission-specific focusing/calibration workflows.",
    },
    {
        "id": "GSLC",
        "name": "Geocoded Single Look Complex",
        "level": "L2",
        "use": "Geocoded complex imagery; input to interferometry and change workflows.",
        "supported_in_mvp": False,
        "note": "Download and calibration not enabled in this build.",
    },
    {
        "id": "GCOV",
        "name": "Geocoded Polarimetric Covariance",
        "level": "L2",
        "use": "Calibrated backscatter covariance products for land and water applications.",
        "supported_in_mvp": False,
        "note": "Closest family to the MVP backscatter workflow, but not downloaded here.",
    },
    {
        "id": "GUNW",
        "name": "Geocoded Unwrapped Interferogram",
        "level": "L2",
        "use": "Surface displacement and coherence from repeat-pass interferometry.",
        "supported_in_mvp": False,
        "note": "Displacement analysis is deliberately not run on unsuitable products.",
    },
    {
        "id": "GOFF",
        "name": "Geocoded Pixel Offsets",
        "level": "L3",
        "use": "Large-displacement estimates from offset tracking.",
        "supported_in_mvp": False,
        "note": "Not implemented in the MVP.",
    },
]


async def discover_nisar(
    bbox: list[float],
    start: str | None = None,
    end: str | None = None,
    max_results: int | None = None,
) -> DiscoveryResult:
    """Discover NISAR granule metadata via ASF, falling back to STAC."""
    settings = get_settings()
    asf_result = await search_asf(
        bbox, start=start, end=end, max_results=max_results, platform="NISAR"
    )
    if asf_result.ok:
        return asf_result

    stac_result = await search_stac(
        bbox, start=start, end=end, max_results=max_results, collections=None
    )
    if stac_result.ok:
        stac_result.warning = (
            stac_result.warning + " " if stac_result.warning else ""
        ) + "ASF search was unavailable; results come from the configured STAC catalog."
        return stac_result

    asf_result.error = f"{asf_result.error} STAC fallback also failed: {stac_result.error}"
    asf_result.endpoint = settings.asf_search_url
    return asf_result


def discovery_status() -> dict[str, Any]:
    settings = get_settings()
    return {
        "enabled": settings.live_discovery_enabled,
        "asf_endpoint": settings.asf_search_url,
        "stac_endpoint": settings.stac_api_url,
        "earthdata_credentials_configured": settings.has_earthdata_credentials,
        "download_supported": False,
        "processing_supported": False,
        "note": (
            "Metadata discovery can run without credentials. Downloading NISAR products "
            "requires authenticated NASA Earthdata access; authenticated download and "
            "calibration are not implemented in this MVP."
        ),
        "mission": MISSION_FACTS,
        "product_families": PRODUCT_FAMILIES,
        "analysis_support": {
            "implemented": [
                "backscatter_difference_db",
                "low_backscatter_water_indicator",
            ],
            "not_implemented": ["insar_displacement", "polarimetric_decomposition"],
            "guard": (
                "TerraPulse never runs displacement analysis. GUNW/RSLC products are shown "
                "as metadata only and are not processed by this build."
            ),
        },
    }
