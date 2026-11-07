"""Pydantic schemas for the TerraPulse API."""

from __future__ import annotations

from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, Field, model_validator


class CompareRequest(BaseModel):
    before_observation_id: int = Field(..., gt=0)
    after_observation_id: int = Field(..., gt=0)
    method: Literal["water_change", "backscatter_diff"] = "water_change"
    change_threshold_db: float = Field(3.0, gt=0.1, le=20.0)
    water_threshold_db: float = Field(-17.0, lt=0.0, ge=-40.0)

    @model_validator(mode="after")
    def observations_differ(self) -> CompareRequest:
        if self.before_observation_id == self.after_observation_id:
            raise ValueError("Select two different observations")
        return self


class ObservationBrief(BaseModel):
    id: int
    external_id: str
    acquired_at: datetime
    mission: str
    polarization: str
    data_mode: str
    is_synthetic: bool
    preview_url: str | None = None


class ObservationOut(ObservationBrief):
    location_id: int
    location_slug: str | None = None
    location_name: str | None = None
    platform: str
    instrument: str
    product_type: str
    acquisition_mode: str
    resolution_m: float
    crs: str
    bbox: list[float]
    source_name: str
    source_url: str | None = None
    provenance: dict[str, Any] = Field(default_factory=dict)
    scene_metadata: dict[str, Any] = Field(default_factory=dict)
    preview_available: bool = False
    access_note: str | None = None


class AnalysisSummaryOut(BaseModel):
    id: int
    location_id: int
    location_slug: str
    location_name: str
    country: str
    before_observation_id: int
    after_observation_id: int
    before_date: str
    after_date: str
    method: str
    change_threshold_db: float
    water_threshold_db: float
    data_mode: str
    is_synthetic: bool
    change_area_km2: float
    water_gain_km2: float
    water_loss_km2: float
    net_water_change_km2: float
    changed_fraction: float
    confidence_score: float
    confidence_label: str
    summary: str
    bounds: list[float]
    created_at: datetime
    before_preview_url: str | None = None
    after_preview_url: str | None = None
    water_overlay_url: str | None = None
    change_overlay_url: str | None = None


class AnalysisOut(AnalysisSummaryOut):
    status: str
    stats: dict[str, Any]
    quality: dict[str, Any]
    limitations: list[str]
    interpretation: str
    geojson_url: str
    before: ObservationBrief
    after: ObservationBrief


class LocationOut(BaseModel):
    id: int
    slug: str
    name: str
    country: str
    region: str
    focus: str
    scenario: str
    description: str
    monitoring_note: str
    center_lat: float
    center_lon: float
    bbox: list[float]
    is_demo: bool
    observation_count: int = 0
    latest_analysis: AnalysisSummaryOut | None = None


class ExplanationOut(BaseModel):
    mode: str
    engine: str
    headline: str
    summary: str
    observations: list[str]
    interpretation: str
    environmental_relevance: str
    technical_indicators: list[dict[str, Any]]
    confidence: dict[str, Any]
    method: dict[str, Any]
    analysis_period: dict[str, Any]
    source_data: list[dict[str, Any]]
    uncertainty: list[str]
    limitations: list[str]
    sources: list[dict[str, Any]]
    disclaimer: str
    note: str | None = None


class TimelineOut(BaseModel):
    location: LocationOut
    observations: list[dict[str, Any]]
    comparisons: list[dict[str, Any]]
    trend_summary: str
    data_mode: str
    is_synthetic: bool
    generated_at: datetime


class DashboardOut(BaseModel):
    generated_at: datetime
    data_status: dict[str, Any]
    stats: dict[str, Any]
    locations: list[dict[str, Any]]
    recent_analyses: list[AnalysisSummaryOut]
    recent_observations: list[ObservationOut]
    environmental_indicators: list[dict[str, Any]]
    nisar: dict[str, Any]
    notes: list[str]


class LiveSearchResponse(BaseModel):
    provider: str
    ok: bool
    items: list[dict[str, Any]]
    error: str | None = None
    warning: str | None = None
    endpoint: str | None = None
    queried_at: str
    query: dict[str, Any]
    disclaimer: str = (
        "Live results are metadata only. No granule is downloaded or processed; "
        "TerraPulse DEMO analysis is unaffected."
    )
