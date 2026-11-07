"""TerraPulse FastAPI application."""

from __future__ import annotations

import asyncio
import logging
import time
import uuid
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

from app.api.routes import router
from app.core.config import get_settings
from app.core.logging import configure_logging
from app.db.database import SessionLocal, init_db
from app.db.seed import seed_database

settings = get_settings()
logger = logging.getLogger("terraplus")


@asynccontextmanager
async def lifespan(_: FastAPI):
    configure_logging()
    settings.ensure_dirs()
    init_db()
    try:

        def _seed() -> dict:
            with SessionLocal() as db:
                return seed_database(db)

        result = await asyncio.to_thread(_seed)
        logger.info("Seed result: %s", result, extra={"event": "seed_complete"})
    except Exception:
        logger.exception("Demo seeding failed; API will start but demo data may be incomplete")
    yield


app = FastAPI(
    title="TerraPulse API",
    description=(
        "Earth Surface Intelligence Platform API. Bundled observations and analyses are "
        "synthetic DEMO data. NISAR integration supports live granule metadata discovery; "
        "authenticated product download and calibration are not enabled in this MVP."
    ),
    version=settings.version,
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_tags=[
        {
            "name": "system",
            "description": "Health, configuration and data attribution.",
        },
        {"name": "dashboard", "description": "Aggregated intelligence dashboard."},
        {"name": "locations", "description": "Monitored demonstration areas."},
        {
            "name": "observations",
            "description": "Satellite observations and live NASA discovery.",
        },
        {
            "name": "analysis",
            "description": "Change-detection analysis jobs and explanations.",
        },
        {"name": "timeline", "description": "Temporal analysis."},
        {"name": "map", "description": "Map layer definitions."},
    ],
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["X-Request-ID"],
)


@app.middleware("http")
async def observability_and_headers(request: Request, call_next):
    request_id = request.headers.get("x-request-id") or uuid.uuid4().hex[:16]
    start = time.perf_counter()
    content_length = request.headers.get("content-length")
    if content_length and content_length.isdigit() and int(content_length) > 1_000_000:
        return JSONResponse(
            status_code=413,
            content={"detail": "Request body is too large"},
            headers={"X-Request-ID": request_id},
        )

    try:
        response = await call_next(request)
    except Exception:
        logger.exception(
            "Unhandled request error",
            extra={
                "request_id": request_id,
                "method": request.method,
                "path": request.url.path,
            },
        )
        response = JSONResponse(
            status_code=500,
            content={"detail": "Internal server error", "request_id": request_id},
            headers={"X-Request-ID": request_id},
        )
    duration_ms = round((time.perf_counter() - start) * 1000, 1)
    logger.info(
        "HTTP request",
        extra={
            "request_id": request_id,
            "method": request.method,
            "path": request.url.path,
            "status_code": response.status_code,
            "duration_ms": duration_ms,
        },
    )
    response.headers["X-Request-ID"] = request_id
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    return response


app.include_router(router, prefix=settings.api_prefix)
app.mount("/media", StaticFiles(directory=str(settings.media_dir)), name="media")


@app.get("/", include_in_schema=False)
def root() -> dict:
    return {
        "name": "TerraPulse API",
        "version": settings.version,
        "status": "ok",
        "docs": "/docs",
        "health": f"{settings.api_prefix}/health",
        "frontend": "Run the Next.js frontend on http://localhost:3000",
        "data_notice": "Bundled observations are synthetic DEMO data, not real NASA pixels.",
    }
