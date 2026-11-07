"""Idempotent database seeding and demo-scene generation."""

from __future__ import annotations

import logging
import math
from datetime import datetime
from pathlib import Path

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.paths import to_data_relative
from app.db.models import (
    Analysis,
    AnalysisStatistic,
    DataProduct,
    DataProvenance,
    DataSource,
    Location,
    Observation,
)
from app.services.demo.generator import generate_scenario_scenes
from app.services.demo.scenarios import DEMO_SCENARIOS, DemoScenario
from app.services.processing.pipeline import compare_rasters

logger = logging.getLogger(__name__)

ANALYSIS_PAIRS = [(0, 2), (2, 3), (1, 2)]


def _parse_date(date_iso: str) -> datetime:
    return datetime.fromisoformat(date_iso.replace("Z", "+00:00"))


def _external_id(scenario: DemoScenario, date_iso: str) -> str:
    return f"TP-DEMO-{scenario.slug.upper()}-{date_iso[:10].replace('-', '')}"


def seed_data_sources(db: Session) -> None:
    settings = get_settings()
    sample_available = settings.sample_manifest_path.exists()
    entries = [
        {
            "key": "nisar-mission",
            "name": "NASA-ISRO SAR (NISAR) Mission",
            "provider": "NASA / ISRO",
            "description": (
                "NISAR is a joint NASA-ISRO Earth-observing radar mission. It carries "
                "L-band and S-band SAR instruments and is designed for global monitoring "
                "of solid Earth, ice, ecosystems and water. TerraPulse uses NISAR as its "
                "design target; the bundled demonstration scenes are synthetic."
            ),
            "url": "https://science.nasa.gov/mission/nisar/",
            "attribution": "NASA / ISRO NISAR mission documentation",
            "license_note": "NASA content generally open; follow NASA media usage guidelines.",
            "modes": ["live", "sample"],
            "is_available": True,
            "status_note": "Mission reference and integration target. No NISAR pixels are bundled.",
        },
        {
            "key": "asf-search",
            "name": "ASF DAAC Granule Search",
            "provider": "Alaska Satellite Facility",
            "description": (
                "ASF provides public metadata search for SAR granules, including NISAR "
                "product discovery. TerraPulse can query ASF when live discovery is enabled. "
                "Downloading protected products requires NASA Earthdata Login."
            ),
            "url": "https://search.asf.alaska.edu/",
            "attribution": "Alaska Satellite Facility DAAC",
            "license_note": "ASF data access is subject to NASA Earthdata terms.",
            "modes": ["live"],
            "is_available": settings.live_discovery_enabled,
            "status_note": (
                "Live metadata discovery enabled."
                if settings.live_discovery_enabled
                else "Live discovery disabled by configuration."
            ),
        },
        {
            "key": "nisar-sample",
            "name": "NISAR Sample Products",
            "provider": "NASA / ASF",
            "description": (
                "Official NISAR sample products published by NASA/ASF. TerraPulse supports "
                "a staged SAMPLE dataset through data/sample/manifest.json. No sample "
                "products are bundled in this build."
            ),
            "url": "https://science.nasa.gov/mission/nisar/sample-data/",
            "attribution": "NASA NISAR sample data",
            "license_note": "Follow NASA and ASF data-use guidance.",
            "modes": ["sample"],
            "is_available": sample_available,
            "status_note": (
                "Staged sample manifest found."
                if sample_available
                else "No staged sample manifest. SAMPLE mode falls back to DEMO with a visible label."
            ),
        },
        {
            "key": "cmr-stac",
            "name": "NASA CMR STAC / ASF STAC",
            "provider": "NASA EOSDIS",
            "description": (
                "STAC-compatible catalog access for mission discovery. TerraPulse exposes a "
                "generic STAC search adapter; availability depends on the configured endpoint "
                "and network access."
            ),
            "url": settings.stac_api_url,
            "attribution": "NASA EOSDIS Common Metadata Repository",
            "license_note": "NASA open data policy.",
            "modes": ["live"],
            "is_available": settings.live_discovery_enabled,
            "status_note": "STAC discovery adapter available; remote availability not verified at startup.",
        },
        {
            "key": "terraplus-demo",
            "name": "TerraPulse Synthetic Demo Generator",
            "provider": "TerraPulse team",
            "description": (
                "Deterministic, clearly-labelled synthetic SAR backscatter scenes generated "
                "locally with realistic georeferencing, dB values, four-look speckle and "
                "nodata. Real coordinates, fabricated pixels."
            ),
            "url": "/methodology#data-modes",
            "attribution": "TerraPulse synthetic demonstration dataset",
            "license_note": "Generated locally for the NASA Space Apps Challenge demonstration.",
            "modes": ["demo"],
            "is_available": True,
            "status_note": "Always available offline.",
        },
        {
            "key": "esri-world-imagery",
            "name": "Esri World Imagery (basemap)",
            "provider": "Esri and contributors",
            "description": (
                "Optional satellite basemap tiles used only for geographic context in the "
                "map interface. TerraPulse falls back to a solid dark basemap if tiles are "
                "unreachable."
            ),
            "url": "https://www.arcgis.com/home/item.html?id=10df2279f9684e4a9f6a7f08febac2a9",
            "attribution": "Esri, Maxar, Earthstar Geographics, and the GIS User Community",
            "license_note": "Subject to Esri tile service terms and attribution requirements.",
            "modes": ["demo", "sample", "live"],
            "is_available": True,
            "status_note": "Optional remote basemap; the analysis overlay works without it.",
        },
    ]

    for entry in entries:
        existing = db.scalar(select(DataSource).where(DataSource.key == entry["key"]))
        if existing is None:
            db.add(DataSource(**entry))
        else:
            for field, value in entry.items():
                setattr(existing, field, value)
    db.flush()


def _create_analysis(
    db: Session,
    location: Location,
    before_observation: Observation,
    after_observation: Observation,
    scenario: DemoScenario,
) -> Analysis:
    settings = get_settings()
    before_dt = before_observation.acquired_at
    after_dt = after_observation.acquired_at
    before_label = before_dt.date().isoformat()
    after_label = after_dt.date().isoformat()

    output_dir = settings.media_dir / "demo" / scenario.slug / "analyses"
    stem = f"analysis-{before_observation.id}-{after_observation.id}"
    outcome = compare_rasters(
        before_path=settings.data_dir / before_observation.raster_path,
        after_path=settings.data_dir / after_observation.raster_path,
        output_dir=output_dir,
        output_stem=stem,
        before_label=before_label,
        after_label=after_label,
        change_threshold_db=settings.default_change_threshold_db,
        water_threshold_db=settings.default_water_threshold_db,
        method="water_change",
        is_synthetic=True,
        max_pixels=settings.max_analysis_pixels,
        display_bounds=scenario.bbox,
    )

    analysis = Analysis(
        location_id=location.id,
        before_observation_id=before_observation.id,
        after_observation_id=after_observation.id,
        method="water_change",
        change_threshold_db=settings.default_change_threshold_db,
        water_threshold_db=settings.default_water_threshold_db,
        status="completed",
        data_mode="demo",
        is_synthetic=True,
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
            source_name="TerraPulse synthetic demo processing pipeline",
            source_url=None,
            mode="demo",
            notes=(
                "Computed from two generated demonstration GeoTIFFs. "
                "Threshold-based dB change and low-backscatter water indicator. "
                "Not validated against ground observations."
            ),
        )
    )
    return analysis


def seed_database(db: Session) -> dict:
    settings = get_settings()
    seed_data_sources(db)
    db.commit()

    location_count = db.scalar(select(func.count(Location.id))) or 0
    analysis_count = db.scalar(select(func.count(Analysis.id))) or 0
    complete = location_count >= len(DEMO_SCENARIOS) and analysis_count >= len(
        DEMO_SCENARIOS
    ) * len(ANALYSIS_PAIRS)
    if complete:
        logger.info("Database already seeded", extra={"event": "seed_skipped"})
        return {
            "status": "already_seeded",
            "locations": location_count,
            "analyses": analysis_count,
        }

    raster_root = settings.raster_dir / "demo"
    media_root = settings.media_dir / "demo"

    for scenario in DEMO_SCENARIOS:
        scenes = generate_scenario_scenes(scenario, raster_root, media_root)

        location = db.scalar(select(Location).where(Location.slug == scenario.slug))
        if location is None:
            location = Location(
                slug=scenario.slug,
                name=scenario.name,
                country=scenario.country,
                region=scenario.region,
                focus=scenario.focus,
                scenario=scenario.scenario,
                description=scenario.description,
                monitoring_note=scenario.monitoring_note,
                center_lat=scenario.center_lat,
                center_lon=scenario.center_lon,
                bbox=scenario.bbox,
                is_demo=True,
            )
            db.add(location)
            db.flush()

        observations: list[Observation] = []
        for scene in scenes:
            external_id = _external_id(scenario, scene["scene_date"])
            observation = db.scalar(
                select(Observation).where(Observation.external_id == external_id)
            )
            acquired_at = _parse_date(scene["scene_date"])
            scene_metadata = {
                key: value
                for key, value in scene.items()
                if key not in {"raster_path", "preview_path", "tags"}
            }
            if observation is None:
                raster_relative = to_data_relative(Path(scene["raster_path"]))
                preview_relative = to_data_relative(Path(scene["preview_path"]))
                observation = Observation(
                    external_id=external_id,
                    location_id=location.id,
                    mission="TerraPulse Synthetic Demo",
                    platform="Simulated SAR (not a real mission)",
                    instrument="Simulated C-band SAR",
                    product_type="SYNTHETIC_DEMO_BACKSCATTER_DB",
                    acquisition_mode="DEMO",
                    polarization="VV",
                    resolution_m=round(
                        (scenario.bbox[2] - scenario.bbox[0])
                        * 111_320
                        * math.cos(math.radians(scenario.center_lat))
                        / scene["width"],
                        1,
                    ),
                    crs="EPSG:4326",
                    acquired_at=acquired_at,
                    bbox=scenario.bbox,
                    raster_path=raster_relative,
                    preview_path=preview_relative,
                    data_mode="demo",
                    source_name="TerraPulse demo generator",
                    source_url=None,
                    is_synthetic=True,
                    provenance={
                        "generator": "TerraPulse synthetic SAR scene generator",
                        "scenario": scenario.scenario,
                        "disclaimer": scene["tags"]["DISCLAIMER"],
                        "generated_on": datetime.now().astimezone().isoformat(),
                        "geography": "Real coordinates; synthetic radar pixels",
                    },
                    scene_metadata=scene_metadata,
                )
                db.add(observation)
                db.flush()
                db.add(
                    DataProduct(
                        observation_id=observation.id,
                        product_id=f"{external_id}-VV-DB",
                        level="L2-demo",
                        file_format="GeoTIFF",
                        size_bytes=scene["file_size_bytes"],
                        download_url=None,
                        checksum=None,
                    )
                )
                db.add(
                    DataProvenance(
                        entity_type="observation",
                        entity_id=str(observation.id),
                        source_name="TerraPulse synthetic demo generator",
                        source_url=None,
                        mode="demo",
                        notes=scene["tags"]["DISCLAIMER"],
                    )
                )
            observations.append(observation)

        db.flush()

        for before_index, after_index in ANALYSIS_PAIRS:
            before_observation = observations[before_index]
            after_observation = observations[after_index]
            existing = db.scalar(
                select(Analysis).where(
                    Analysis.before_observation_id == before_observation.id,
                    Analysis.after_observation_id == after_observation.id,
                )
            )
            if existing is not None:
                continue
            _create_analysis(db, location, before_observation, after_observation, scenario)

        db.commit()
        logger.info(
            "Seeded scenario",
            extra={"event": "seed_scenario", "path": scenario.slug},
        )

    final_locations = db.scalar(select(func.count(Location.id))) or 0
    final_observations = db.scalar(select(func.count(Observation.id))) or 0
    final_analyses = db.scalar(select(func.count(Analysis.id))) or 0
    return {
        "status": "seeded",
        "locations": final_locations,
        "observations": final_observations,
        "analyses": final_analyses,
    }
