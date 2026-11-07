"""Vectorisation of change masks into web-friendly GeoJSON."""

from __future__ import annotations

import json
import math
from pathlib import Path
from typing import Any

import numpy as np
import rasterio.features
from shapely.geometry import mapping, shape

KM_PER_DEGREE_LAT = 110.574
KM_PER_DEGREE_LON_AT_EQUATOR = 111.320


def _approx_area_km2(geom, center_lat: float) -> float:
    area_deg2 = float(geom.area)
    return (
        area_deg2
        * KM_PER_DEGREE_LAT
        * KM_PER_DEGREE_LON_AT_EQUATOR
        * math.cos(math.radians(center_lat))
    )


def masks_to_geojson(
    layers: dict[str, np.ndarray],
    transform,
    center_lat: float,
    metadata: dict[str, Any],
    tolerance: float,
    min_pixel_area: float,
    max_features: int = 400,
) -> dict[str, Any]:
    features: list[dict[str, Any]] = []
    layer_counts: dict[str, int] = {}

    for layer_name, mask in layers.items():
        count = 0
        for geom, value in rasterio.features.shapes(
            mask.astype(np.uint8), mask=mask, transform=transform
        ):
            if int(value) != 1:
                continue
            polygon = shape(geom)
            area_km2 = _approx_area_km2(polygon, center_lat)
            if area_km2 < min_pixel_area:
                continue
            simplified = polygon.simplify(tolerance, preserve_topology=True)
            if simplified.is_empty:
                continue
            features.append(
                {
                    "type": "Feature",
                    "geometry": mapping(simplified),
                    "properties": {
                        "layer": layer_name,
                        "area_km2": round(area_km2, 4),
                    },
                }
            )
            count += 1
        layer_counts[layer_name] = count

    features.sort(key=lambda feature: feature["properties"]["area_km2"], reverse=True)
    truncated = len(features) > max_features
    features = features[:max_features]

    return {
        "type": "FeatureCollection",
        "metadata": {
            **metadata,
            "feature_counts": layer_counts,
            "returned_features": len(features),
            "truncated": truncated,
            "note": "Vector outlines are derived from the analysis raster. Areas are approximate screen-scale statistics, not surveyed extents.",
        },
        "features": features,
    }


def write_geojson(path: Path, payload: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, separators=(",", ":")), encoding="utf-8")
