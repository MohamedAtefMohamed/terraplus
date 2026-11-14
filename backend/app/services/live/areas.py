"""Real monitoring areas used by the live pipeline.

These are real places with real bounding boxes. No raster data is bundled.
"""

from __future__ import annotations

import math
from dataclasses import dataclass


@dataclass(frozen=True)
class Area:
    slug: str
    name: str
    country: str
    region: str
    focus: str
    description: str
    note: str
    bbox: list[float]

    @property
    def center_lon(self) -> float:
        return (self.bbox[0] + self.bbox[2]) / 2

    @property
    def center_lat(self) -> float:
        return (self.bbox[1] + self.bbox[3]) / 2

    @property
    def area_km2(self) -> float:
        west, south, east, north = self.bbox
        mean_lat = math.radians((south + north) / 2)
        width_km = (east - west) * 111.32 * math.cos(mean_lat)
        height_km = (north - south) * 110.57
        return round(abs(width_km * height_km), 1)


AREAS: list[Area] = [
    Area(
        slug="sundarbans",
        name="Sundarbans Delta",
        country="Bangladesh / India",
        region="Ganges-Brahmaputra Delta",
        focus="Flood & wetland change",
        description=(
            "A tidal delta of mangrove forest, distributary channels, and seasonal flooding. "
            "Comparisons here track how the low-backscatter water signal moves between passes."
        ),
        note="Real Sentinel-1 coverage. The change numbers describe radar backscatter, not a flood extent.",
        bbox=[88.96, 21.76, 89.42, 22.10],
    ),
    Area(
        slug="atchafalaya",
        name="Atchafalaya Basin",
        country="United States",
        region="Louisiana Gulf Coast",
        focus="Wetland & water change",
        description=(
            "A low-relief coastal basin with marsh, swamp forest, levees, and many small water "
            "bodies. Small, fragmented changes need careful reading in radar imagery."
        ),
        note="Real Sentinel-1 coverage. Marsh and swamp change can mimic a water signal.",
        bbox=[-91.60, 29.52, -91.16, 29.83],
    ),
    Area(
        slug="mekong",
        name="Mekong Delta",
        country="Vietnam",
        region="Lower Mekong Basin",
        focus="Flood & wetland change",
        description=(
            "A densely cultivated delta with distributary channels and strong seasonal hydrology. "
            "Comparisons here cover mixed land and water surfaces across a large area."
        ),
        note="Real Sentinel-1 coverage. Rice and aquaculture cycles also change backscatter.",
        bbox=[105.82, 9.92, 106.28, 10.26],
    ),
]


def get_area(slug: str) -> Area | None:
    return next((area for area in AREAS if area.slug == slug), None)


def area_index(slug: str) -> int:
    for index, area in enumerate(AREAS):
        if area.slug == slug:
            return index
    raise KeyError(slug)