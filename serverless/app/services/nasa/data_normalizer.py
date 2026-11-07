"""Normalise heterogeneous NASA catalog records into one discovery shape.

Discovery records are metadata only. TerraPulse never claims that a discovered
granule has been downloaded or processed.
"""

from __future__ import annotations

from typing import Any

from shapely.geometry import shape


def _first(props: dict[str, Any], *keys: str) -> Any:
    for key in keys:
        if key in props and props[key] not in (None, ""):
            return props[key]
    return None


def _geometry_info(
    geometry: dict[str, Any] | None,
) -> tuple[list[float] | None, float | None, float | None]:
    if not geometry:
        return None, None, None
    try:
        geom = shape(geometry)
        bounds = [round(value, 6) for value in geom.bounds]
        centroid = geom.centroid
        return bounds, round(centroid.y, 6), round(centroid.x, 6)
    except Exception:
        return None, None, None


def normalize_asf_feature(feature: dict[str, Any]) -> dict[str, Any]:
    props = feature.get("properties") or {}
    geometry = feature.get("geometry")
    bounds, center_lat, center_lon = _geometry_info(geometry)
    platform = str(_first(props, "platform", "platformName", "Platform") or "Unknown")
    mission = "NISAR" if "NISAR" in platform.upper() else platform

    granule = _first(
        props,
        "granuleName",
        "granule_name",
        "sceneName",
        "scene_name",
        "fileID",
        "id",
        feature.get("id"),
    )
    start_time = _first(props, "startTime", "start_time", "start", "acquisitionDate", "datetime")
    product_type = _first(
        props,
        "productType",
        "product_type",
        "processingLevel",
        "processing_level",
        "product_type_name",
    )
    download_url = _first(
        props,
        "downloadUrl",
        "download_url",
        "url",
        "dataUrl",
    )
    browse = _first(props, "browse", "browse_url", "thumbnail")
    if isinstance(browse, list):
        browse = next(
            (item for item in browse if isinstance(item, str) and "thumbnail" in item),
            browse[0] if browse and isinstance(browse[0], str) else None,
        )
    size = _first(props, "bytes", "size", "granuleSize")
    try:
        size_bytes = int(size) if size is not None else None
    except (TypeError, ValueError):
        size_bytes = None

    return {
        "id": granule or str(feature.get("id") or "unknown-granule"),
        "provider": "ASF",
        "mission": mission,
        "platform": platform,
        "instrument": _first(props, "instrumentName", "instrument", "sensor"),
        "product_type": str(product_type) if product_type else None,
        "processing_level": _first(props, "processingLevel", "processing_level"),
        "polarization": _first(
            props, "polarization", "mainBandPolarization", "polarisations", "polarizationName"
        ),
        "acquisition_mode": _first(props, "beamModeType", "acquisitionMode", "mode"),
        "flight_direction": _first(props, "flightDirection", "flight_direction"),
        "path": _first(props, "pathNumber", "path"),
        "frame": _first(props, "frameNumber", "frame"),
        "acquired_at": start_time,
        "stop_at": _first(props, "stopTime", "stop_time", "stop"),
        "bbox": bounds,
        "center_lat": center_lat,
        "center_lon": center_lon,
        "size_bytes": size_bytes,
        "download_url": download_url,
        "browse_url": browse,
        "geometry": geometry,
        "data_mode": "live",
        "is_synthetic": False,
        "raster_available": False,
        "access_note": (
            "Granule metadata discovered live. Downloading and calibrating the product "
            "requires authenticated NASA Earthdata access and is not performed by this demo."
        ),
        "source": "ASF DAAC granule search",
        "source_url": "https://search.asf.alaska.edu/",
        "raw_properties": {
            key: value
            for key, value in props.items()
            if isinstance(value, (str, int, float, bool)) or value is None
        },
    }


def normalize_stac_feature(feature: dict[str, Any]) -> dict[str, Any]:
    props = feature.get("properties") or {}
    geometry = feature.get("geometry")
    bounds, center_lat, center_lon = _geometry_info(geometry)
    assets = feature.get("assets") or {}
    download_url = None
    for asset in assets.values():
        if isinstance(asset, dict) and asset.get("href"):
            download_url = asset["href"]
            break
    platform = str(_first(props, "platform", "constellation") or "Unknown")
    mission = "NISAR" if "NISAR" in platform.upper() else platform
    return {
        "id": str(feature.get("id") or "unknown-stac-item"),
        "provider": "STAC",
        "mission": mission,
        "platform": platform,
        "instrument": _first(props, "instruments", "instrument"),
        "product_type": _first(props, "product:type", "sar:product_type", "product_type"),
        "processing_level": _first(props, "processing:level", "processing_level"),
        "polarization": _first(props, "sar:polarizations", "polarization", "mainBandPolarization"),
        "acquisition_mode": _first(props, "sar:instrument_mode", "acquisition_mode"),
        "flight_direction": _first(props, "sat:orbit_state", "flight_direction"),
        "path": _first(props, "sat:relative_orbit", "path"),
        "frame": _first(props, "frame", "frame_number"),
        "acquired_at": _first(props, "datetime", "start_datetime", "created"),
        "stop_at": _first(props, "end_datetime"),
        "bbox": bounds or feature.get("bbox"),
        "center_lat": center_lat,
        "center_lon": center_lon,
        "size_bytes": None,
        "download_url": download_url,
        "browse_url": None,
        "geometry": geometry,
        "collection": feature.get("collection"),
        "data_mode": "live",
        "is_synthetic": False,
        "raster_available": False,
        "access_note": (
            "STAC item metadata discovered live. Product download and calibration are not "
            "performed by this demonstration build."
        ),
        "source": "NASA CMR / STAC catalog",
        "source_url": None,
        "raw_properties": {
            key: value
            for key, value in props.items()
            if isinstance(value, (str, int, float, bool)) or value is None
        },
    }
