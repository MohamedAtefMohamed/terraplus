from __future__ import annotations

import rasterio
from sqlalchemy import select

from app.core.paths import resolve_data_path
from app.db.database import SessionLocal
from app.db.models import Analysis, DataSource, Location, Observation


def test_demo_records_are_labelled_as_synthetic(client):
    with SessionLocal() as db:
        locations = list(db.scalars(select(Location)).all())
        observations = list(db.scalars(select(Observation)).all())
        analyses = list(db.scalars(select(Analysis)).all())
        sources = list(db.scalars(select(DataSource)).all())

    assert len(locations) == 3
    assert len(observations) == 12
    assert len(analyses) >= 9
    assert len(sources) >= 5

    for observation in observations:
        assert observation.is_synthetic is True
        assert observation.data_mode == "demo"
        assert "NISAR" not in observation.mission.upper()
        assert "SYNTHETIC" in observation.product_type.upper()
        assert observation.provenance["disclaimer"]
        assert "Not a NISAR" in observation.provenance["disclaimer"]
        raster = resolve_data_path(observation.raster_path)
        preview = resolve_data_path(observation.preview_path)
        assert raster.exists()
        assert preview.exists()

    with rasterio.open(resolve_data_path(observations[0].raster_path)) as dataset:
        tags = dataset.tags()
        assert tags["IS_SYNTHETIC"] == "true"
        assert "NISAR" not in tags["MISSION"].upper()
        assert dataset.crs.to_string() == "EPSG:4326"
        assert dataset.nodata == -9999.0

    for analysis in analyses:
        assert analysis.is_synthetic is True
        assert analysis.data_mode == "demo"
        assert analysis.limitations
        assert analysis.status == "completed"


def test_demo_analysis_pairs_use_real_dates(client):
    with SessionLocal() as db:
        analyses = list(db.scalars(select(Analysis)).all())
    for analysis in analyses:
        with SessionLocal() as db:
            before = db.get(Observation, analysis.before_observation_id)
            after = db.get(Observation, analysis.after_observation_id)
        assert before is not None and after is not None
        assert before.acquired_at < after.acquired_at
        assert before.location_id == after.location_id
