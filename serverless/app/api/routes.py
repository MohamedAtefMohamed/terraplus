"""TerraPulse HTTP API (live-only data)."""

from __future__ import annotations

import time
from datetime import UTC, datetime
from threading import Lock

from fastapi import APIRouter, Depends, HTTPException, Path, Query, Request
from fastapi.responses import JSONResponse

from app.core.config import get_settings
from app.schemas.analysis import (
    AnalysisOut,
    AnalysisSummaryOut,
    DashboardOut,
    ExplanationOut,
    LocationOut,
    ObservationOut,
    TimelineOut,
)
from app.services.live.areas import AREAS, categories, get_area
from app.services.live.nisar_live import nisar_status, recent_nisar
from app.services.live.sentinel1_change import (
    LiveChangeError,
    available_scenes,
    compute_change,
)
from app.services.live.store import (
    compare_for_location,
    dashboard_payload,
    data_sources_payload,
    get_analysis,
    get_explanation,
    get_location,
    get_observation,
    get_observation_by_external_id,
    layers_payload,
    list_analyses,
    list_locations,
    list_observations,
    timeline_payload,
)

router = APIRouter()
settings = get_settings()

_compare_events: dict[str, list[float]] = {}
_compare_lock = Lock()


def _client_key(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


def _enforce_compare_rate_limit(request: Request) -> None:
    now = time.monotonic()
    window_start = now - 60.0
    key = _client_key(request)
    with _compare_lock:
        events = [event for event in _compare_events.get(key, []) if event >= window_start]
        if len(events) >= settings.compare_rate_limit_per_minute:
            raise HTTPException(
                status_code=429,
                detail="Too many comparisons. Wait a minute before running another one.",
                headers={"Retry-After": "60"},
            )
        events.append(now)
        _compare_events[key] = events


def _bbox_from(raw: str | None, location: str | None) -> list[float]:
    if raw:
        try:
            values = [float(part) for part in raw.split(",")]
        except ValueError as exc:
            raise HTTPException(
                status_code=422, detail="bbox must be four comma-separated numbers"
            ) from exc
        if len(values) != 4:
            raise HTTPException(status_code=422, detail="bbox must be west,south,east,north")
        west, south, east, north = values
        if not (-180 <= west < east <= 180 and -90 <= south < north <= 90):
            raise HTTPException(
                status_code=422, detail="bbox is outside valid longitude/latitude bounds"
            )
        return values
    if location:
        area = get_area(location)
        if area is None:
            raise HTTPException(status_code=404, detail="Location not found")
        return area.bbox
    raise HTTPException(
        status_code=422,
        detail="Provide bbox=west,south,east,north or a known location slug",
    )


@router.get("/health", tags=["system"])
def health() -> dict:
    return {
        "status": "ok",
        "app": settings.app_name,
        "version": settings.version,
        "database": "unused",
        "data_mode": "live",
        "analysis_mode": "live",
        "timestamp": datetime.now(UTC).isoformat(),
    }


@router.get("/config/status", tags=["system"])
def config() -> dict:
    return {
        "app": settings.app_name,
        "version": settings.version,
        "environment": settings.environment,
        "data": {
            "requested_mode": "live",
            "effective_mode": "live",
            "analysis_mode": "live",
            "label": "LIVE DATA",
            "is_synthetic": False,
            "fallback_reason": None,
            "sample": {
                "available": False,
                "observation_count": 0,
                "note": "No sample data is used.",
                "source": None,
            },
            "live": {
                "enabled": True,
                "earthdata_credentials_configured": settings.has_earthdata_credentials,
                "download_supported": False,
                "note": (
                    "NISAR catalogue discovery and browse imagery run without credentials. "
                    "Pixel change uses public Sentinel-1 GRD scenes."
                ),
            },
        },
        "nisar": nisar_status(),
        "llm": {
            "enabled": False,
            "provider": "deterministic",
            "model": None,
            "key_present": bool(settings.openai_api_key),
            "note": "Explanations are generated from the live comparison result without an LLM.",
        },
        "defaults": {
            "change_threshold_db": settings.default_change_threshold_db,
            "water_threshold_db": settings.default_water_threshold_db,
        },
    }


@router.get("/data-sources", tags=["system"])
def data_sources() -> dict:
    return data_sources_payload()


@router.get("/dashboard/summary", response_model=DashboardOut, tags=["dashboard"])
def dashboard_summary() -> dict:
    return dashboard_payload()


@router.get("/locations", response_model=list[LocationOut], tags=["locations"])
def locations() -> list[dict]:
    return list_locations()


@router.get("/locations/{slug}", response_model=LocationOut, tags=["locations"])
def location_detail(slug: str = Path(..., min_length=1, max_length=80)) -> dict:
    row = get_location(slug)
    if row is None:
        raise HTTPException(status_code=404, detail=f"Location '{slug}' was not found")
    return row


@router.get("/observations", response_model=list[ObservationOut], tags=["observations"])
def observations(
    location: str | None = Query(None, max_length=80),
    limit: int = Query(100, ge=1, le=300),
) -> list[dict]:
    return list_observations(location=location, limit=limit)


@router.get("/observations/search", tags=["observations"])
def live_observation_search(
    bbox: str | None = Query(None, description="west,south,east,north"),
    location: str | None = Query(None, max_length=80),
    days: int = Query(45, ge=1, le=365),
    limit: int = Query(25, ge=1, le=50),
) -> dict:
    bbox_values = _bbox_from(bbox, location) if (bbox or location) else None
    catalogue = recent_nisar(bbox=bbox_values, days=days, limit=limit)
    items = []
    for granule in catalogue.get("items", []):
        items.append(
            {
                "id": granule["id"],
                "provider": "ASF",
                "mission": "NISAR",
                "platform": granule.get("platform") or "NISAR",
                "instrument": granule.get("sensor") or "L-SAR",
                "product_type": granule.get("product_type"),
                "processing_level": granule.get("product_level"),
                "polarization": granule.get("polarization") or [],
                "acquisition_mode": granule.get("flight_direction"),
                "flight_direction": granule.get("flight_direction"),
                "path": granule.get("track"),
                "frame": granule.get("frame"),
                "acquired_at": granule.get("start"),
                "stop_at": granule.get("end"),
                "bbox": None,
                "center_lat": granule.get("center_lat"),
                "center_lon": granule.get("center_lon"),
                "size_bytes": None,
                "download_url": granule.get("download_url"),
                "browse_url": granule.get("browse_latlon") or granule.get("browse_thumbnail"),
                "geometry": (
                    {"type": "Polygon", "coordinates": [granule["footprint"]]}
                    if granule.get("footprint")
                    else None
                ),
                "data_mode": "live",
                "is_synthetic": False,
                "raster_available": False,
                "access_note": "Live NISAR catalogue record. Browse imagery is a quick-look.",
            }
        )
    return {
        "provider": "ASF",
        "ok": catalogue.get("ok", False),
        "items": items,
        "error": catalogue.get("error"),
        "warning": None,
        "endpoint": "https://api.daac.asf.alaska.edu/services/search/param",
        "queried_at": catalogue.get("queried_at"),
        "query": catalogue.get("query"),
        "disclaimer": "Live NISAR catalogue metadata. No product is downloaded or processed.",
    }


@router.get("/observations/{observation_id}", response_model=ObservationOut, tags=["observations"])
def observation_detail(observation_id: int = Path(..., gt=0)) -> dict:
    row = get_observation(observation_id)
    if row is None:
        raise HTTPException(status_code=404, detail="Observation not found")
    return row


@router.get(
    "/observations/by-external-id/{external_id}",
    response_model=ObservationOut,
    tags=["observations"],
)
def observation_by_external_id(external_id: str = Path(..., min_length=1, max_length=300)) -> dict:
    row = get_observation_by_external_id(external_id)
    if row is None:
        raise HTTPException(status_code=404, detail="Observation not found")
    return row


@router.get("/analysis", response_model=list[AnalysisSummaryOut], tags=["analysis"])
def analysis_list(location: str | None = Query(None, max_length=80)) -> list[dict]:
    return list_analyses(location=location)


@router.post(
    "/analysis/compare",
    response_model=AnalysisOut,
    status_code=201,
    tags=["analysis"],
    dependencies=[Depends(_enforce_compare_rate_limit)],
)
def compare(
    location: str = Query(..., min_length=1, max_length=80),
    days: int = Query(180, ge=7, le=365),
    threshold_db: float = Query(3.0, ge=0.5, le=12.0),
) -> dict:
    result = compare_for_location(location, days=days, threshold_db=threshold_db)
    if result is None:
        raise HTTPException(
            status_code=422,
            detail=(
                "No same-track Sentinel-1 pair is available for this area yet. "
                "Try a larger window or another area."
            ),
        )
    return result


@router.get("/analysis/{analysis_id}", response_model=AnalysisOut, tags=["analysis"])
def analysis_detail(analysis_id: int = Path(..., gt=0)) -> dict:
    row = get_analysis(analysis_id)
    if row is None:
        raise HTTPException(status_code=404, detail="Analysis not found")
    return row


@router.get("/analysis/{analysis_id}/statistics", tags=["analysis"])
def analysis_statistics(analysis_id: int = Path(..., gt=0)) -> dict:
    row = get_analysis(analysis_id)
    if row is None:
        raise HTTPException(status_code=404, detail="Analysis not found")
    return {
        "analysis_id": analysis_id,
        "stats": row["stats"],
        "quality": row["quality"],
        "method": {
            "change_threshold_db": row["change_threshold_db"],
            "water_threshold_db": row["water_threshold_db"],
        },
        "limitations": row["limitations"],
    }


@router.get("/analysis/{analysis_id}/explanation", response_model=ExplanationOut, tags=["analysis"])
def analysis_explanation(analysis_id: int = Path(..., gt=0)) -> dict:
    row = get_explanation(analysis_id)
    if row is None:
        raise HTTPException(status_code=404, detail="Explanation not available")
    return row


@router.get("/analysis/{analysis_id}/geojson", tags=["analysis"])
def analysis_geojson(analysis_id: int = Path(..., gt=0)) -> JSONResponse:
    row = get_analysis(analysis_id)
    if row is None:
        raise HTTPException(status_code=404, detail="Analysis not found")
    geojson = row.get("geojson")
    if geojson is None:
        raise HTTPException(status_code=404, detail="Vector layer is not available")
    return JSONResponse(content=geojson, headers={"Cache-Control": "public, max-age=300"})


@router.get("/timeline", response_model=TimelineOut, tags=["timeline"])
def timeline(location: str = Query(..., min_length=1, max_length=80)) -> dict:
    row = timeline_payload(location)
    if row is None:
        raise HTTPException(status_code=404, detail="Location not found")
    return row


@router.get("/layers", tags=["map"])
def layers() -> dict:
    return layers_payload()


# ---------------------------------------------------------------------------
# Live data endpoints (unchanged contract used by the live lab)
# ---------------------------------------------------------------------------


@router.get("/live/nisar", tags=["live"])
def live_nisar(
    bbox: str | None = Query(None, description="west,south,east,north"),
    location: str | None = Query(None, max_length=80),
    days: int = Query(45, ge=1, le=365),
    limit: int = Query(40, ge=1, le=100),
) -> dict:
    bbox_values = _bbox_from(bbox, location) if (bbox or location) else None
    return recent_nisar(bbox=bbox_values, days=days, limit=limit)


@router.get("/live/sentinel1", tags=["live"])
def live_sentinel1(
    bbox: str = Query(..., description="west,south,east,north"),
    days: int = Query(90, ge=7, le=365),
) -> dict:
    bbox_values = _bbox_from(bbox, None)
    try:
        return available_scenes(bbox_values, days=days)
    except LiveChangeError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc


@router.post("/live/change", tags=["live"])
def live_change(
    bbox: str = Query(..., description="west,south,east,north"),
    days: int = Query(90, ge=7, le=365),
    threshold_db: float = Query(3.0, ge=0.5, le=12.0),
    force: bool = Query(False),
) -> dict:
    bbox_values = _bbox_from(bbox, None)
    try:
        return compute_change(
            bbox_values,
            days=days,
            threshold_db=threshold_db,
            grid_size=settings.live_change_grid_size,
            force=force,
        )
    except LiveChangeError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc


@router.get("/live/status", tags=["live"])
def live_status() -> dict:
    return {
        "nisar": nisar_status(),
        "sentinel1": {
            "stac": "https://earth-search.aws.element84.com/v1",
            "collection": "sentinel-1-grd",
            "requires_credentials": False,
            "note": "Windowed COG reads over HTTPS; read-only.",
        },
    }


@router.get("/areas", tags=["live"])
def areas() -> dict:
    return {
        "count": len(AREAS),
        "categories": categories(),
        "areas": [
            {
                "slug": area.slug,
                "name": area.name,
                "country": area.country,
                "region": area.region,
                "focus": area.focus,
                "category": area.category,
                "description": area.description,
                "bbox": area.bbox,
                "center": [area.center_lon, area.center_lat],
                "area_km2": area.area_km2,
                "note": area.note,
            }
            for area in AREAS
        ],
    }