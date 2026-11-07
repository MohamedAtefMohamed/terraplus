"""Dashboard aggregation."""

from __future__ import annotations

from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload, selectinload

from app.db.models import Analysis, DataSource, Location, Observation
from app.services.mode_service import resolve_mode
from app.services.nasa.nisar_client import MISSION_FACTS, discovery_status
from app.services.serialization import (
    analysis_summary,
    location_out,
    observation_out,
)


def build_dashboard(db: Session) -> dict:
    locations = list(
        db.scalars(
            select(Location).options(selectinload(Location.observations)).order_by(Location.name)
        ).all()
    )
    analyses = list(
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
    latest_by_location: dict[int, Analysis] = {}
    for analysis in analyses:
        latest_by_location.setdefault(analysis.location_id, analysis)

    recent_observations = list(
        db.scalars(
            select(Observation)
            .options(joinedload(Observation.location))
            .order_by(Observation.acquired_at.desc())
            .limit(8)
        ).all()
    )

    latest_analyses = list(latest_by_location.values())
    total_observed_area = sum(
        float((analysis.stats or {}).get("aoi_area_km2", 0.0)) for analysis in latest_analyses
    )
    total_change_area = sum(analysis.change_area_km2 for analysis in latest_analyses)
    total_gain = sum(analysis.water_gain_km2 for analysis in latest_analyses)
    total_loss = sum(analysis.water_loss_km2 for analysis in latest_analyses)
    avg_confidence = (
        sum(analysis.confidence_score for analysis in latest_analyses) / len(latest_analyses)
        if latest_analyses
        else 0.0
    )
    total_observations = sum(len(location.observations) for location in locations)

    indicators = []
    for analysis in sorted(
        latest_analyses, key=lambda item: item.location.name if item.location else ""
    ):
        stats = analysis.stats or {}
        indicators.append(
            {
                "location_slug": analysis.location.slug if analysis.location else None,
                "location_name": analysis.location.name if analysis.location else "",
                "label": "Net water-indicator change",
                "value": float(stats.get("net_water_change_km2", 0.0)),
                "unit": "km²",
                "period": f"{analysis.before_observation.acquired_at.date().isoformat()} → {analysis.after_observation.acquired_at.date().isoformat()}",
                "confidence": analysis.confidence_label,
                "direction": "gain"
                if float(stats.get("net_water_change_km2", 0.0)) >= 0
                else "loss",
                "data_mode": analysis.data_mode,
                "is_synthetic": analysis.is_synthetic,
            }
        )

    mode = resolve_mode()
    source_count = (
        db.scalar(select(DataSource).where(DataSource.is_available.is_(True))) is not None
    )
    nisar_live = discovery_status()

    has_sample = (
        db.scalar(select(Observation.id).where(Observation.data_mode == "sample").limit(1))
        is not None
    )
    notes = [
        (
            "The platform contains both synthetic demonstration scenes and staged sample observations. Every record carries its own mode, source and provenance."
            if has_sample
            else "All bundled observation pixels and analyses are synthetic demonstration data. Real coordinates, fabricated radar backscatter."
        ),
        "NASA NISAR integration supports live granule metadata discovery through ASF; authenticated download and calibration are not enabled in this MVP.",
    ]
    if mode["fallback_reason"]:
        notes.append(mode["fallback_reason"])
    if not source_count:
        notes.append("No data sources are marked available; check configuration.")

    return {
        "generated_at": datetime.now(UTC),
        "data_status": {
            **mode,
            "data_source_count": len(
                [source for source in db.scalars(select(DataSource)).all() if source.is_available]
            ),
        },
        "stats": {
            "locations": len(locations),
            "observations": total_observations,
            "analyses": len(analyses),
            "demo_area_monitored_km2": round(total_observed_area, 2),
            "area_in_latest_analyses_km2": round(total_observed_area, 2),
            "latest_change_area_km2": round(total_change_area, 2),
            "latest_water_gain_km2": round(total_gain, 2),
            "latest_water_loss_km2": round(total_loss, 2),
            "average_confidence": round(avg_confidence, 3),
        },
        "locations": [
            location_out(
                location,
                latest_by_location.get(location.id),
            )
            for location in locations
        ],
        "recent_analyses": [analysis_summary(analysis) for analysis in analyses[:6]],
        "recent_observations": [
            observation_out(observation) for observation in recent_observations
        ],
        "environmental_indicators": indicators,
        "nisar": {
            "mission": MISSION_FACTS,
            "discovery": {
                "enabled": nisar_live["enabled"],
                "earthdata_credentials_configured": nisar_live["earthdata_credentials_configured"],
                "download_supported": nisar_live["download_supported"],
                "processing_supported": nisar_live["processing_supported"],
                "note": nisar_live["note"],
            },
        },
        "notes": notes,
    }


def build_layers() -> dict:
    return {
        "mode": "demo",
        "disclaimer": (
            "All four layers are demonstration concepts. Footprints are example monitoring "
            "areas, not real NISAR coverage. Overlays come from synthetic scenes."
        ),
        "layers": [
            {
                "key": "radar_observations",
                "name": "Radar observations",
                "kind": "footprints",
                "color": "#22d3ee",
                "description": "Demonstration acquisition footprints and dates. These are example monitoring areas, not real satellite coverage.",
                "available": True,
                "data_mode": "demo",
                "legend": [{"label": "Demo acquisition footprint", "color": "#22d3ee"}],
            },
            {
                "key": "detected_changes",
                "name": "Detected changes",
                "kind": "raster",
                "color": "#2dd4bf",
                "description": "Backscatter change beyond the configurable ± dB threshold. Derived from synthetic scenes.",
                "available": True,
                "data_mode": "demo",
                "legend": [
                    {"label": "Backscatter increase", "color": "#2dd4bf"},
                    {"label": "Backscatter decrease", "color": "#fb923c"},
                ],
            },
            {
                "key": "water_change",
                "name": "Water-related change",
                "kind": "raster",
                "color": "#38bdf8",
                "description": "Low-backscatter water indicator gain and loss. Not a flood extent.",
                "available": True,
                "data_mode": "demo",
                "legend": [
                    {
                        "label": "New low-backscatter water indicator",
                        "color": "#38bdf8",
                    },
                    {
                        "label": "Lost low-backscatter water indicator",
                        "color": "#fb923c",
                    },
                    {"label": "Persistent water indicator", "color": "#0c324a"},
                ],
            },
            {
                "key": "wetland_monitoring",
                "name": "Wetland monitoring areas",
                "kind": "aoi",
                "color": "#34d399",
                "description": "Demonstration areas selected for flood and wetland change monitoring scenarios.",
                "available": True,
                "data_mode": "demo",
                "legend": [{"label": "Demonstration monitoring area", "color": "#34d399"}],
            },
        ],
    }
