"""TerraPulse HTTP API."""

from __future__ import annotations

import json
import time
from datetime import UTC, date, datetime
from threading import Lock

from fastapi import APIRouter, Depends, HTTPException, Path, Query, Request
from fastapi.responses import JSONResponse
from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload, selectinload

from app.core.config import get_settings
from app.db.database import get_db
from app.db.models import Analysis, DataSource, Location, Observation
from app.schemas.analysis import (
    AnalysisOut,
    AnalysisSummaryOut,
    CompareRequest,
    DashboardOut,
    ExplanationOut,
    LiveSearchResponse,
    LocationOut,
    ObservationOut,
    TimelineOut,
)
from app.services.analysis_service import (
    AnalysisRequestError,
    create_comparison,
    get_analysis,
    list_analyses,
    load_geojson,
    statistics_out,
)
from app.services.dashboard_service import build_dashboard, build_layers
from app.services.explanation_service import build_explanation
from app.services.mode_service import config_status, resolve_mode
from app.services.nasa.nisar_client import discover_nisar
from app.services.serialization import (
    analysis_out,
    analysis_summary,
    location_out,
    observation_out,
)
from app.services.timeline_service import TimelineError, build_timeline

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
                detail="Too many comparisons. Please wait a minute before running another analysis.",
                headers={"Retry-After": "60"},
            )
        events.append(now)
        _compare_events[key] = events


def _latest_analyses(db: Session) -> dict[int, Analysis]:
    analyses = (
        db.scalars(
            select(Analysis)
            .options(
                joinedload(Analysis.location),
                joinedload(Analysis.before_observation),
                joinedload(Analysis.after_observation),
            )
            .order_by(Analysis.id.desc())
        )
        .unique()
        .all()
    )
    latest: dict[int, Analysis] = {}
    for analysis in analyses:
        latest.setdefault(analysis.location_id, analysis)
    return latest


def _get_location_or_404(db: Session, slug: str) -> Location:
    location = db.scalar(
        select(Location).options(selectinload(Location.observations)).where(Location.slug == slug)
    )
    if location is None:
        raise HTTPException(status_code=404, detail=f"Location '{slug}' was not found")
    return location


def _parse_bbox(raw: str | None, location: Location | None) -> list[float]:
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
                status_code=422,
                detail="bbox is outside valid longitude/latitude bounds",
            )
        return values
    if location is not None:
        return location.bbox
    raise HTTPException(
        status_code=422,
        detail="Provide bbox=west,south,east,north or a known location slug",
    )


@router.get("/health", tags=["system"])
def health(db: Session = Depends(get_db)) -> dict:
    try:
        db.execute(select(1))
        database = "ok"
    except Exception:
        database = "error"
    mode = resolve_mode()
    return {
        "status": "ok" if database == "ok" else "degraded",
        "app": settings.app_name,
        "version": settings.version,
        "database": database,
        "data_mode": mode["effective_mode"],
        "analysis_mode": mode["analysis_mode"],
        "timestamp": datetime.now(UTC).isoformat(),
    }


@router.get("/config/status", tags=["system"])
def config() -> dict:
    return config_status()


@router.get("/data-sources", tags=["system"])
def data_sources(db: Session = Depends(get_db)) -> dict:
    rows = list(db.scalars(select(DataSource).order_by(DataSource.id)).all())
    return {
        "data": resolve_mode(),
        "sources": [
            {
                "key": row.key,
                "name": row.name,
                "provider": row.provider,
                "description": row.description,
                "url": row.url,
                "attribution": row.attribution,
                "license_note": row.license_note,
                "modes": row.modes,
                "is_available": row.is_available,
                "status_note": row.status_note,
            }
            for row in rows
        ],
    }


@router.get("/dashboard/summary", response_model=DashboardOut, tags=["dashboard"])
def dashboard_summary(db: Session = Depends(get_db)) -> dict:
    return build_dashboard(db)


@router.get("/locations", response_model=list[LocationOut], tags=["locations"])
def locations(db: Session = Depends(get_db)) -> list[dict]:
    rows = db.scalars(
        select(Location).options(selectinload(Location.observations)).order_by(Location.name)
    ).all()
    latest = _latest_analyses(db)
    return [location_out(location, latest.get(location.id)) for location in rows]


@router.get("/locations/{slug}", response_model=LocationOut, tags=["locations"])
def location_detail(
    slug: str = Path(..., min_length=1, max_length=80), db: Session = Depends(get_db)
) -> dict:
    location = _get_location_or_404(db, slug)
    latest = _latest_analyses(db).get(location.id)
    return location_out(location, latest)


@router.get("/observations", response_model=list[ObservationOut], tags=["observations"])
def observations(
    location: str | None = Query(None, max_length=80),
    start: date | None = Query(None),
    end: date | None = Query(None),
    limit: int = Query(100, ge=1, le=300),
    db: Session = Depends(get_db),
) -> list[dict]:
    query = (
        select(Observation)
        .options(joinedload(Observation.location))
        .order_by(Observation.acquired_at.desc())
        .limit(limit)
    )
    if location:
        query = query.join(Location).where(Location.slug == location)
    if start:
        query = query.where(
            Observation.acquired_at >= datetime.combine(start, datetime.min.time(), tzinfo=UTC)
        )
    if end:
        query = query.where(
            Observation.acquired_at <= datetime.combine(end, datetime.max.time(), tzinfo=UTC)
        )
    rows = db.scalars(query).unique().all()
    return [observation_out(observation) for observation in rows]


@router.get(
    "/observations/search",
    response_model=LiveSearchResponse,
    tags=["observations"],
)
async def live_observation_search(
    bbox: str | None = Query(None, description="west,south,east,north"),
    location: str | None = Query(None, max_length=80),
    start: date | None = Query(None),
    end: date | None = Query(None),
    limit: int = Query(25, ge=1, le=50),
    db: Session = Depends(get_db),
) -> dict:
    location_row = None
    if location:
        location_row = db.scalar(select(Location).where(Location.slug == location))
        if location_row is None:
            raise HTTPException(status_code=404, detail="Location not found")
    bbox_values = _parse_bbox(bbox, location_row)
    result = await discover_nisar(
        bbox_values,
        start=start.isoformat() if start else None,
        end=end.isoformat() if end else None,
        max_results=limit,
    )
    return {
        "provider": result.provider,
        "ok": result.ok,
        "items": result.items,
        "error": result.error,
        "warning": result.warning,
        "endpoint": result.endpoint,
        "queried_at": result.queried_at,
        "query": result.query,
    }


@router.get(
    "/observations/{observation_id}",
    response_model=ObservationOut,
    tags=["observations"],
)
def observation_detail(
    observation_id: int = Path(..., gt=0), db: Session = Depends(get_db)
) -> dict:
    observation = db.scalar(
        select(Observation)
        .options(joinedload(Observation.location))
        .where(Observation.id == observation_id)
    )
    if observation is None:
        raise HTTPException(status_code=404, detail="Observation not found")
    return observation_out(observation)


@router.get("/analysis", response_model=list[AnalysisSummaryOut], tags=["analysis"])
def analysis_list(
    location: str | None = Query(None, max_length=80),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
) -> list[dict]:
    if location and db.scalar(select(Location).where(Location.slug == location)) is None:
        raise HTTPException(status_code=404, detail="Location not found")
    return [analysis_summary(analysis) for analysis in list_analyses(db, location, limit)]


@router.post(
    "/analysis/compare",
    response_model=AnalysisOut,
    status_code=201,
    tags=["analysis"],
    dependencies=[Depends(_enforce_compare_rate_limit)],
)
def compare(payload: CompareRequest, db: Session = Depends(get_db)) -> dict:
    try:
        analysis = create_comparison(db, payload)
    except AnalysisRequestError as exc:
        raise HTTPException(status_code=exc.status_code, detail=str(exc)) from exc
    return analysis_out(analysis)


@router.get("/analysis/{analysis_id}", response_model=AnalysisOut, tags=["analysis"])
def analysis_detail(analysis_id: int = Path(..., gt=0), db: Session = Depends(get_db)) -> dict:
    analysis = get_analysis(db, analysis_id)
    if analysis is None:
        raise HTTPException(status_code=404, detail="Analysis not found")
    return analysis_out(analysis)


@router.get("/analysis/{analysis_id}/statistics", tags=["analysis"])
def analysis_statistics(analysis_id: int = Path(..., gt=0), db: Session = Depends(get_db)) -> dict:
    analysis = get_analysis(db, analysis_id)
    if analysis is None:
        raise HTTPException(status_code=404, detail="Analysis not found")
    return statistics_out(analysis)


@router.get(
    "/analysis/{analysis_id}/explanation",
    response_model=ExplanationOut,
    tags=["analysis"],
)
async def analysis_explanation(
    analysis_id: int = Path(..., gt=0), db: Session = Depends(get_db)
) -> dict:
    analysis = get_analysis(db, analysis_id)
    if analysis is None:
        raise HTTPException(status_code=404, detail="Analysis not found")
    return await build_explanation(
        analysis,
        analysis.before_observation,
        analysis.after_observation,
        analysis.location,
    )


@router.get("/analysis/{analysis_id}/geojson", tags=["analysis"])
def analysis_geojson(
    analysis_id: int = Path(..., gt=0), db: Session = Depends(get_db)
) -> JSONResponse:
    analysis = get_analysis(db, analysis_id)
    if analysis is None:
        raise HTTPException(status_code=404, detail="Analysis not found")
    path = load_geojson(analysis)
    if path is None:
        raise HTTPException(
            status_code=404, detail="Vector layer is not available for this analysis"
        )
    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        raise HTTPException(status_code=500, detail="Vector layer could not be read") from exc
    return JSONResponse(
        content=payload,
        headers={"Cache-Control": "public, max-age=300"},
    )


@router.get("/timeline", response_model=TimelineOut, tags=["timeline"])
def timeline(
    location: str = Query(..., min_length=1, max_length=80),
    db: Session = Depends(get_db),
) -> dict:
    try:
        return build_timeline(db, location)
    except TimelineError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.get("/layers", tags=["map"])
def layers() -> dict:
    return build_layers()
