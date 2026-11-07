"""SQLAlchemy models for TerraPulse.

The schema is intentionally PostgreSQL/PostGIS friendly: geometry is stored as
GeoJSON-compatible JSON, rasters live on disk, and identifiers are surrogate
integers. Moving to PostGIS later is a migration, not a redesign.
"""

from __future__ import annotations

from datetime import UTC, datetime

from sqlalchemy import JSON, DateTime, Float, ForeignKey, Index, Integer, String, Text
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


def utcnow() -> datetime:
    return datetime.now(UTC)


class Base(DeclarativeBase):
    pass


class Location(Base):
    __tablename__ = "locations"

    id: Mapped[int] = mapped_column(primary_key=True)
    slug: Mapped[str] = mapped_column(String(80), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(140))
    country: Mapped[str] = mapped_column(String(120))
    region: Mapped[str] = mapped_column(String(160))
    focus: Mapped[str] = mapped_column(String(120), default="Flood & wetland change")
    scenario: Mapped[str] = mapped_column(String(160))
    description: Mapped[str] = mapped_column(Text)
    monitoring_note: Mapped[str] = mapped_column(Text, default="")
    center_lat: Mapped[float] = mapped_column(Float)
    center_lon: Mapped[float] = mapped_column(Float)
    bbox: Mapped[list[float]] = mapped_column(JSON)
    is_demo: Mapped[bool] = mapped_column(default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    observations: Mapped[list[Observation]] = relationship(
        back_populates="location",
        cascade="all, delete-orphan",
        order_by="Observation.acquired_at",
    )
    analyses: Mapped[list[Analysis]] = relationship(
        back_populates="location", cascade="all, delete-orphan"
    )


class Observation(Base):
    __tablename__ = "observations"

    id: Mapped[int] = mapped_column(primary_key=True)
    external_id: Mapped[str] = mapped_column(String(160), unique=True, index=True)
    location_id: Mapped[int] = mapped_column(
        ForeignKey("locations.id", ondelete="CASCADE"), index=True
    )

    mission: Mapped[str] = mapped_column(String(120))
    platform: Mapped[str] = mapped_column(String(120))
    instrument: Mapped[str] = mapped_column(String(120))
    product_type: Mapped[str] = mapped_column(String(120))
    acquisition_mode: Mapped[str] = mapped_column(String(60), default="DEMO")
    polarization: Mapped[str] = mapped_column(String(24), default="VV")
    resolution_m: Mapped[float] = mapped_column(Float, default=30.0)
    crs: Mapped[str] = mapped_column(String(40), default="EPSG:4326")

    acquired_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    bbox: Mapped[list[float]] = mapped_column(JSON)

    raster_path: Mapped[str] = mapped_column(String(400))
    preview_path: Mapped[str | None] = mapped_column(String(400), nullable=True)

    data_mode: Mapped[str] = mapped_column(String(16), default="demo")
    source_name: Mapped[str] = mapped_column(String(180))
    source_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    is_synthetic: Mapped[bool] = mapped_column(default=True)
    provenance: Mapped[dict] = mapped_column(JSON, default=dict)
    scene_metadata: Mapped[dict] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    location: Mapped[Location] = relationship(back_populates="observations")
    products: Mapped[list[DataProduct]] = relationship(
        back_populates="observation", cascade="all, delete-orphan"
    )

    __table_args__ = (Index("ix_observation_location_date", "location_id", "acquired_at"),)


class DataProduct(Base):
    __tablename__ = "data_products"

    id: Mapped[int] = mapped_column(primary_key=True)
    observation_id: Mapped[int] = mapped_column(
        ForeignKey("observations.id", ondelete="CASCADE"), index=True
    )
    product_id: Mapped[str] = mapped_column(String(160))
    level: Mapped[str] = mapped_column(String(40), default="L2-demo")
    file_format: Mapped[str] = mapped_column(String(40), default="GTiff")
    size_bytes: Mapped[int | None] = mapped_column(Integer, nullable=True)
    download_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    checksum: Mapped[str | None] = mapped_column(String(120), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    observation: Mapped[Observation] = relationship(back_populates="products")


class Analysis(Base):
    __tablename__ = "analyses"

    id: Mapped[int] = mapped_column(primary_key=True)
    location_id: Mapped[int] = mapped_column(
        ForeignKey("locations.id", ondelete="CASCADE"), index=True
    )
    before_observation_id: Mapped[int] = mapped_column(ForeignKey("observations.id"))
    after_observation_id: Mapped[int] = mapped_column(ForeignKey("observations.id"))

    method: Mapped[str] = mapped_column(String(60), default="water_change")
    change_threshold_db: Mapped[float] = mapped_column(Float, default=3.0)
    water_threshold_db: Mapped[float] = mapped_column(Float, default=-17.0)

    status: Mapped[str] = mapped_column(String(24), default="completed")
    data_mode: Mapped[str] = mapped_column(String(16), default="demo")
    is_synthetic: Mapped[bool] = mapped_column(default=True)

    change_area_km2: Mapped[float] = mapped_column(Float, default=0.0)
    water_gain_km2: Mapped[float] = mapped_column(Float, default=0.0)
    water_loss_km2: Mapped[float] = mapped_column(Float, default=0.0)
    changed_fraction: Mapped[float] = mapped_column(Float, default=0.0)
    confidence_score: Mapped[float] = mapped_column(Float, default=0.0)
    confidence_label: Mapped[str] = mapped_column(String(24), default="Moderate")

    stats: Mapped[dict] = mapped_column(JSON, default=dict)
    quality: Mapped[dict] = mapped_column(JSON, default=dict)
    limitations: Mapped[list] = mapped_column(JSON, default=list)
    summary: Mapped[str] = mapped_column(Text, default="")
    interpretation: Mapped[str] = mapped_column(Text, default="")

    change_overlay_path: Mapped[str | None] = mapped_column(String(400), nullable=True)
    water_overlay_path: Mapped[str | None] = mapped_column(String(400), nullable=True)
    geojson_path: Mapped[str | None] = mapped_column(String(400), nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, index=True
    )

    location: Mapped[Location] = relationship(back_populates="analyses")
    before_observation: Mapped[Observation] = relationship(foreign_keys=[before_observation_id])
    after_observation: Mapped[Observation] = relationship(foreign_keys=[after_observation_id])
    statistics: Mapped[list[AnalysisStatistic]] = relationship(
        back_populates="analysis",
        cascade="all, delete-orphan",
        order_by="AnalysisStatistic.id",
    )


class AnalysisStatistic(Base):
    __tablename__ = "analysis_statistics"

    id: Mapped[int] = mapped_column(primary_key=True)
    analysis_id: Mapped[int] = mapped_column(
        ForeignKey("analyses.id", ondelete="CASCADE"), index=True
    )
    key: Mapped[str] = mapped_column(String(80))
    label: Mapped[str] = mapped_column(String(140))
    value: Mapped[float | None] = mapped_column(Float, nullable=True)
    text_value: Mapped[str | None] = mapped_column(String(160), nullable=True)
    unit: Mapped[str | None] = mapped_column(String(40), nullable=True)
    category: Mapped[str] = mapped_column(String(60), default="general")
    description: Mapped[str | None] = mapped_column(Text, nullable=True)

    analysis: Mapped[Analysis] = relationship(back_populates="statistics")


class DataProvenance(Base):
    __tablename__ = "data_provenance"

    id: Mapped[int] = mapped_column(primary_key=True)
    entity_type: Mapped[str] = mapped_column(String(40), index=True)
    entity_id: Mapped[str] = mapped_column(String(60), index=True)
    source_name: Mapped[str] = mapped_column(String(180))
    source_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    mode: Mapped[str] = mapped_column(String(16), default="demo")
    retrieved_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    notes: Mapped[str] = mapped_column(Text, default="")


class DataSource(Base):
    __tablename__ = "data_sources"

    id: Mapped[int] = mapped_column(primary_key=True)
    key: Mapped[str] = mapped_column(String(60), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(180))
    provider: Mapped[str] = mapped_column(String(160))
    description: Mapped[str] = mapped_column(Text)
    url: Mapped[str] = mapped_column(String(500))
    attribution: Mapped[str] = mapped_column(Text)
    license_note: Mapped[str] = mapped_column(String(240), default="")
    modes: Mapped[list] = mapped_column(JSON, default=list)
    is_available: Mapped[bool] = mapped_column(default=True)
    status_note: Mapped[str] = mapped_column(Text, default="")
