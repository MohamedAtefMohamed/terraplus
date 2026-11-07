"""Analysis orchestration and persistence."""

from __future__ import annotations

from datetime import UTC, datetime
from pathlib import Path

from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.core.config import get_settings
from app.core.paths import resolve_data_path, to_data_relative
from app.db.models import Analysis, AnalysisStatistic, DataProvenance, Observation
from app.schemas.analysis import CompareRequest
from app.services.processing.pipeline import (
    AlignmentError,
    AnalysisError,
    compare_rasters,
)


class AnalysisRequestError(RuntimeError):
    def __init__(self, message: str, status_code: int = 422):
        super().__init__(message)
        self.status_code = status_code


def _analysis_query():
    return select(Analysis).options(
        joinedload(Analysis.location),
        joinedload(Analysis.before_observation),
        joinedload(Analysis.after_observation),
        joinedload(Analysis.statistics),
    )


def get_analysis(db: Session, analysis_id: int) -> Analysis | None:
    return db.scalar(_analysis_query().where(Analysis.id == analysis_id))


def list_analyses(db: Session, location_slug: str | None = None, limit: int = 30) -> list[Analysis]:
    query = _analysis_query().order_by(Analysis.id.desc()).limit(limit)
    if location_slug:
        from app.db.models import Location

        query = query.join(Location).where(Location.slug == location_slug)
    return list(db.scalars(query).unique().all())


def create_comparison(db: Session, payload: CompareRequest) -> Analysis:
    settings = get_settings()
    before = db.get(Observation, payload.before_observation_id)
    after = db.get(Observation, payload.after_observation_id)
    if before is None or after is None:
        raise AnalysisRequestError("One or both observations were not found.", 404)
    if before.location_id != after.location_id:
        raise AnalysisRequestError(
            "Observations belong to different areas. Select two acquisitions from the same area.",
            400,
        )
    if before.acquired_at >= after.acquired_at:
        raise AnalysisRequestError(
            "The earlier observation must precede the later observation.", 400
        )
    if not before.raster_path or not after.raster_path:
        raise AnalysisRequestError(
            "One or both observations are metadata-only. Live NISAR products require "
            "authenticated Earthdata download, which is not enabled in this MVP. "
            "Use the DEMO dataset or stage a SAMPLE product.",
            409,
        )

    try:
        before_path = resolve_data_path(before.raster_path)
        after_path = resolve_data_path(after.raster_path)
    except Exception as exc:
        raise AnalysisRequestError("Observation raster path is not accessible.", 409) from exc

    for path in (before_path, after_path):
        if not path.exists():
            raise AnalysisRequestError(
                f"Raster asset is missing on disk: {path.name}. Re-seed the demo database.",
                409,
            )

    location = before.location
    output_stem = (
        f"analysis-{before.id}-{after.id}-{payload.method}-{int(datetime.now(UTC).timestamp())}"
    )
    output_dir = settings.media_dir / "demo" / location.slug / "analyses"
    is_synthetic = bool(before.is_synthetic or after.is_synthetic)

    try:
        outcome = compare_rasters(
            before_path=before_path,
            after_path=after_path,
            output_dir=output_dir,
            output_stem=output_stem,
            before_label=before.acquired_at.date().isoformat(),
            after_label=after.acquired_at.date().isoformat(),
            change_threshold_db=payload.change_threshold_db,
            water_threshold_db=payload.water_threshold_db,
            method=payload.method,
            is_synthetic=is_synthetic,
            max_pixels=settings.max_analysis_pixels,
            display_bounds=location.bbox,
        )
    except (AlignmentError, AnalysisError) as exc:
        raise AnalysisRequestError(str(exc), 422) from exc
    except Exception as exc:
        raise AnalysisRequestError(
            f"The comparison could not be completed ({exc.__class__.__name__}).", 422
        ) from exc

    analysis = Analysis(
        location_id=location.id,
        before_observation_id=before.id,
        after_observation_id=after.id,
        method=payload.method,
        change_threshold_db=payload.change_threshold_db,
        water_threshold_db=payload.water_threshold_db,
        status="completed",
        data_mode="demo" if is_synthetic else before.data_mode,
        is_synthetic=is_synthetic,
        change_area_km2=outcome.stats["change_area_km2"],
        water_gain_km2=outcome.stats["water_gain_km2"],
        water_loss_km2=outcome.stats["water_loss_km2"],
        changed_fraction=outcome.stats["changed_fraction"],
        confidence_score=outcome.quality["score"],
        confidence_label=outcome.quality["label"],
        stats=outcome.stats,
        quality=outcome.quality,
        limitations=outcome.limitations,
        summary=outcome.summary,
        interpretation=outcome.interpretation,
        change_overlay_path=to_data_relative(outcome.change_overlay_path),
        water_overlay_path=to_data_relative(outcome.water_overlay_path),
        geojson_path=to_data_relative(outcome.geojson_path),
    )
    db.add(analysis)
    db.flush()

    for row in outcome.statistic_rows:
        db.add(
            AnalysisStatistic(
                analysis_id=analysis.id,
                key=row["key"],
                label=row["label"],
                value=row["value"],
                unit=row["unit"],
                category=row["category"],
                description=row["description"],
            )
        )
    db.add(
        DataProvenance(
            entity_type="analysis",
            entity_id=str(analysis.id),
            source_name="TerraPulse processing pipeline",
            source_url=None,
            mode=analysis.data_mode,
            notes=(
                "User-triggered comparison. Threshold-based dB difference and low-backscatter "
                "water indicator. Not validated against ground observations."
            ),
        )
    )
    db.commit()
    loaded = get_analysis(db, analysis.id)
    if loaded is None:
        raise AnalysisRequestError("Analysis was saved but could not be reloaded.", 500)
    return loaded


def statistics_out(analysis: Analysis) -> dict:
    rows = [
        {
            "key": row.key,
            "label": row.label,
            "value": row.value,
            "unit": row.unit,
            "category": row.category,
            "description": row.description,
        }
        for row in sorted(analysis.statistics, key=lambda item: item.id)
    ]
    return {
        "analysis_id": analysis.id,
        "stats": analysis.stats or {},
        "quality": analysis.quality or {},
        "confidence": {
            "score": analysis.confidence_score,
            "label": analysis.confidence_label,
        },
        "rows": rows,
    }


def load_geojson(analysis: Analysis) -> Path | None:
    if not analysis.geojson_path:
        return None
    try:
        path = resolve_data_path(analysis.geojson_path)
    except Exception:
        return None
    return path if path.exists() else None
