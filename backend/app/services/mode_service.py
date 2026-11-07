"""Resolve the active data mode and expose honest capability status."""

from __future__ import annotations

from typing import Any

from app.core.config import get_settings
from app.services.nasa.nisar_client import discovery_status
from app.services.nasa.sample_loader import sample_status


def resolve_mode() -> dict[str, Any]:
    settings = get_settings()
    requested = settings.requested_mode
    sample = sample_status()

    if requested == "auto" or requested == "sample":
        effective = "sample" if sample["available"] else "demo"
    elif requested == "live":
        effective = "live"
    else:
        effective = "demo"

    fallback_reason = None
    if requested in {"sample", "auto"} and not sample["available"]:
        fallback_reason = (
            "SAMPLE data is not staged in this build; the interface is using DEMO data."
        )
    if requested == "live":
        fallback_reason = (
            "LIVE mode enables NISAR metadata discovery. Raster analysis remains DEMO, "
            "because authenticated product download is not enabled in this MVP."
        )

    # Sample processing is not wired into the MVP analysis pipeline. Even when
    # real sample products are staged for discovery, raster analyses shown by the
    # UI are the DEMO dataset and must be labelled as such.
    analysis_mode = "demo"
    label = "DEMO DATA · SYNTHETIC"
    if effective == "sample":
        label = "SAMPLE STAGED · DEMO ANALYSIS"
    elif effective == "live":
        label = "LIVE DISCOVERY · DEMO ANALYSIS"

    return {
        "requested_mode": requested,
        "effective_mode": effective,
        "analysis_mode": analysis_mode,
        "label": label,
        "is_synthetic": True,
        "fallback_reason": fallback_reason,
        "sample": {k: sample[k] for k in ("available", "observation_count", "note", "source")},
        "live": {
            "enabled": settings.live_discovery_enabled,
            "earthdata_credentials_configured": settings.has_earthdata_credentials,
            "download_supported": False,
            "note": (
                "Discover NISAR granule metadata with ASF. Product download requires "
                "NASA Earthdata Login and is not implemented in this MVP."
            ),
        },
    }


def config_status() -> dict[str, Any]:
    settings = get_settings()
    mode = resolve_mode()
    return {
        "app": settings.app_name,
        "version": settings.version,
        "environment": settings.environment,
        "data": mode,
        "nisar": discovery_status(),
        "llm": {
            "enabled": settings.has_llm_credentials,
            "provider": "OpenAI-compatible" if settings.has_llm_credentials else "deterministic",
            "model": settings.openai_model if settings.has_llm_credentials else None,
            "key_present": bool(settings.openai_api_key),
            "note": (
                "Optional LLM narration is enabled (ENABLE_LLM_NARRATION=true). "
                "Deterministic explanations remain the fallback."
                if settings.has_llm_credentials
                else (
                    "An OpenAI-compatible key is present, but LLM narration is disabled. "
                    "The deterministic rule-based explanation engine is fully functional. "
                    "Set ENABLE_LLM_NARRATION=true to opt in."
                    if settings.openai_api_key
                    else "No LLM key configured. The deterministic rule-based explanation engine is fully functional."
                )
            ),
        },
        "defaults": {
            "change_threshold_db": settings.default_change_threshold_db,
            "water_threshold_db": settings.default_water_threshold_db,
        },
    }
