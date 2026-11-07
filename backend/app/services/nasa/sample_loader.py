"""Optional staged real-sample dataset loader.

TerraPulse ships no third-party sample pixels. If a team stages a documented
sample dataset (for example official NISAR sample products), it can be described
by ``data/sample/manifest.json`` and the platform will report SAMPLE availability.

Manifest schema (documented in the README)::

    {
      "source": {"name": "...", "url": "...", "attribution": "..."},
      "observations": [
        {"id": "...", "path": "relative/inside/data/sample.tif",
         "acquired_at": "2025-01-01T00:00:00Z", "bbox": [w,s,e,n],
         "mission": "NISAR", "instrument": "...", "product_type": "...",
         "polarization": "VV", "crs": "EPSG:4326"}
      ]
    }
"""

from __future__ import annotations

import json
from typing import Any

from app.core.config import get_settings
from app.core.paths import resolve_data_path


def sample_status() -> dict[str, Any]:
    settings = get_settings()
    manifest_path = settings.sample_manifest_path
    if not manifest_path.exists():
        return {
            "available": False,
            "manifest_path": str(manifest_path),
            "observation_count": 0,
            "source": None,
            "error": None,
            "note": (
                "No staged SAMPLE dataset is present. SAMPLE mode falls back to DEMO and "
                "labels the fallback in the interface. This build never presents synthetic "
                "data as a real sample product."
            ),
        }
    try:
        manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
        observations = manifest.get("observations", [])
        if not isinstance(observations, list):
            raise ValueError("manifest.observations must be a list")
        validated = []
        for item in observations:
            if not isinstance(item, dict) or "path" not in item:
                continue
            resolve_data_path(f"sample/{item['path']}")  # traversal guard
            validated.append(item)
        return {
            "available": bool(validated),
            "manifest_path": str(manifest_path),
            "observation_count": len(validated),
            "source": manifest.get("source"),
            "observations": validated,
            "error": None,
            "note": "Staged sample dataset detected. Source attribution comes from the manifest.",
        }
    except Exception as exc:
        return {
            "available": False,
            "manifest_path": str(manifest_path),
            "observation_count": 0,
            "source": None,
            "error": f"Sample manifest is invalid: {exc.__class__.__name__}",
            "note": "Falling back to DEMO data.",
        }


def load_sample_manifest() -> dict[str, Any] | None:
    status = sample_status()
    if not status["available"]:
        return None
    manifest = json.loads(get_settings().sample_manifest_path.read_text(encoding="utf-8"))
    return manifest
