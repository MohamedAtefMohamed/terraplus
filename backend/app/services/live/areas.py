"""Real monitoring areas used by the live pipeline.

These are real places with real bounding boxes, drawn from well-known NASA and
ESA Earth-observation study sites. No raster data is bundled: every number in
the product comes from a live catalogue query or a live Sentinel-1 comparison.
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
    category: str
    description: str
    note: str
    bbox: list[float]  # [west, south, east, north] in EPSG:4326

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


# Categories are used for grouping and filtering in the interface.
CATEGORIES = [
    "Flood & wetland",
    "Ice & snow",
    "Sea ice & coast",
    "Wildfire",
    "Agriculture",
    "Subsidence",
    "Volcanism",
]


AREAS: list[Area] = [
    # ---------------------------------------------------------------- flood
    Area(
        slug="sundarbans",
        name="Sundarbans Delta",
        country="Bangladesh / India",
        region="Ganges-Brahmaputra Delta",
        focus="Flood & wetland change",
        category="Flood & wetland",
        description=(
            "A tidal delta of mangrove forest, distributary channels, and seasonal flooding. "
            "Comparisons here track how the low-backscatter water signal moves between passes."
        ),
        note="Real Sentinel-1 coverage. The change numbers describe radar backscatter, not a flood extent.",
        bbox=[88.96, 21.76, 89.42, 22.10],
    ),
    Area(
        slug="mekong",
        name="Mekong Delta",
        country="Vietnam",
        region="Lower Mekong Basin",
        focus="Flood & wetland change",
        category="Flood & wetland",
        description=(
            "A densely cultivated delta with distributary channels and strong seasonal hydrology. "
            "Comparisons cover mixed land and water surfaces across a large area."
        ),
        note="Real Sentinel-1 coverage. Rice and aquaculture cycles also change backscatter.",
        bbox=[105.82, 9.92, 106.28, 10.26],
    ),
    Area(
        slug="atchafalaya",
        name="Atchafalaya Basin",
        country="United States",
        region="Louisiana Gulf Coast",
        focus="Wetland & water change",
        category="Flood & wetland",
        description=(
            "A low-relief coastal basin with marsh, swamp forest, levees, and many small water "
            "bodies. Small, fragmented changes need careful reading in radar imagery."
        ),
        note="Real Sentinel-1 coverage. Marsh and swamp change can mimic a water signal.",
        bbox=[-91.60, 29.52, -91.16, 29.83],
    ),
    Area(
        slug="okavango",
        name="Okavango Delta",
        country="Botswana",
        region="Kalahari Basin",
        focus="Seasonal flood pulse",
        category="Flood & wetland",
        description=(
            "An inland delta that floods from a distant catchment, so the water signal appears "
            "months after local rainfall. A good test of seasonal timing in radar backscatter."
        ),
        note="Real Sentinel-1 coverage. Pasture and reed beds shift the signal alongside water.",
        bbox=[22.30, -19.70, 23.40, -18.80],
    ),
    Area(
        slug="indus-floodplain",
        name="Indus Floodplain",
        country="Pakistan",
        region="Sindh",
        focus="Monsoon inundation",
        category="Flood & wetland",
        description=(
            "A wide, low-gradient floodplain that carries the monsoon peak. Floodplain channels "
            "and irrigated fields sit close enough in brightness to need careful screening."
        ),
        note="Real Sentinel-1 coverage. Irrigation and crop calendars also move the signal.",
        bbox=[68.00, 25.20, 68.80, 25.90],
    ),
    # ------------------------------------------------------------------ ice
    Area(
        slug="ilulissat",
        name="Ilulissat Icefjord",
        country="Greenland",
        region="West Greenland",
        focus="Glacier calving front",
        category="Ice & snow",
        description=(
            "The calving front of Sermeq Kujalleq, one of the fastest-moving glaciers outside "
            "Antarctica. Radar separates the smooth fjord ice from crevassed glacier ice."
        ),
        note="Real Sentinel-1 coverage. Melt state and wind roughening change the fjord surface.",
        bbox=[-51.50, 69.05, -50.20, 69.40],
    ),
    Area(
        slug="bering-glacier",
        name="Bering Glacier",
        country="United States",
        region="Alaska",
        focus="Glacier terminus and meltwater",
        category="Ice & snow",
        description=(
            "The largest glacier in North America, with a piedmont lobe and a large moraine-dammed "
            "lake that drains and refills. Terminal position is visible in radar backscatter."
        ),
        note="Real Sentinel-1 coverage. Snow wetness confounds the signal in summer.",
        bbox=[-143.50, 60.20, -142.30, 60.70],
    ),
    Area(
        slug="utqiagvik",
        name="Utqiaġvik Coast",
        country="United States",
        region="North Slope, Alaska",
        focus="Landfast sea ice and coastal erosion",
        category="Sea ice & coast",
        description=(
            "Landfast ice, open leads, and an eroding bluffed coastline. The contrast between "
            "smooth ice, rough rubble, and open water is unusually clear in radar."
        ),
        note="Real Sentinel-1 coverage. Ice type and rubble fields complicate a binary reading.",
        bbox=[-157.00, 71.15, -156.10, 71.50],
    ),
    # -------------------------------------------------------------- wildfire
    Area(
        slug="fort-mcmurray",
        name="Fort McMurray",
        country="Canada",
        region="Northern Alberta",
        focus="Boreal burn scar and regrowth",
        category="Wildfire",
        description=(
            "Boreal forest surrounding a city that burned in 2016. Burn scars stay visible to "
            "radar for years, and regrowth slowly lifts the backscatter again."
        ),
        note="Real Sentinel-1 coverage. Structure, not colour, drives the burn-scar signature.",
        bbox=[-112.30, 56.40, -110.90, 57.00],
    ),
    Area(
        slug="pantanal",
        name="Pantanal",
        country="Brazil",
        region="Mato Grosso do Sul",
        focus="Fire and seasonal inundation",
        category="Wildfire",
        description=(
            "The world's largest tropical wetland, alternating between flood and severe fire "
            "years. Wetland, burned grassland, and dry forest separate well in radar."
        ),
        note="Real Sentinel-1 coverage. Fire scars and shallow water can look similar in amplitude.",
        bbox=[-57.40, -17.80, -56.30, -16.90],
    ),
    # ------------------------------------------------------------ agriculture
    Area(
        slug="iowa-cropland",
        name="Iowa Cropland",
        country="United States",
        region="Midwest Corn Belt",
        focus="Crop growth and harvest cycles",
        category="Agriculture",
        description=(
            "Row crop fields that swing from bare soil to full canopy and back each season. "
            "Radar tracks canopy structure and surface moisture rather than colour."
        ),
        note="Real Sentinel-1 coverage. Tillage and residue cover mimic part of the crop cycle.",
        bbox=[-93.70, 41.80, -92.90, 42.30],
    ),
    Area(
        slug="punjab-rice",
        name="Punjab Rice Belt",
        country="India",
        region="Indo-Gangetic Plain",
        focus="Paddy transplant and crop calendars",
        category="Agriculture",
        description=(
            "A double-cropped rice and wheat belt where flood-irrigated transplanting changes "
            "the surface for weeks at a time. A long-standing radar agriculture test site."
        ),
        note="Real Sentinel-1 coverage. Irrigation timing is local and varies field to field.",
        bbox=[74.60, 30.60, 75.50, 31.10],
    ),
    # ------------------------------------------------------------- subsidence
    Area(
        slug="jakarta",
        name="Jakarta",
        country="Indonesia",
        region="Java",
        focus="Urban subsidence and coastal flooding",
        category="Subsidence",
        description=(
            "A delta megacity sinking at decimetres per year in places, with tidal flooding in "
            "the north. Radar tracks surface stability and standing water."
        ),
        note="Real Sentinel-1 coverage. Dense buildings scatter strongly; displacement needs InSAR, not amplitude alone.",
        bbox=[106.60, -6.40, 107.10, -5.95],
    ),
    Area(
        slug="mexico-city",
        name="Mexico City Basin",
        country="Mexico",
        region="Valley of Mexico",
        focus="Ground subsidence",
        category="Subsidence",
        description=(
            "An elevated basin built on a drained lakebed, with some of the fastest subsidence "
            "ever measured. Urban texture makes a stable radar reference frame."
        ),
        note="Real Sentinel-1 coverage. Amplitude change shows surface state, not millimetre motion.",
        bbox=[-99.30, 19.25, -98.85, 19.55],
    ),
    # ------------------------------------------------------------- volcanism
    Area(
        slug="kilauea",
        name="Kīlauea",
        country="United States",
        region="Hawaiʻi Island",
        focus="Lava flows and summit change",
        category="Volcanism",
        description=(
            "One of the most active volcanoes on Earth. Fresh lava appears as very rough, bright "
            "radar terrain, and flow fields change between years."
        ),
        note="Real Sentinel-1 coverage. Vegetation recovery on old flows also brightens the signal.",
        bbox=[-155.45, 19.20, -154.75, 19.65],
    ),
]


def get_area(slug: str) -> Area | None:
    return next((area for area in AREAS if area.slug == slug), None)


def area_index(slug: str) -> int:
    for index, area in enumerate(AREAS):
        if area.slug == slug:
            return index
    raise KeyError(slug)


def categories() -> list[str]:
    return [name for name in CATEGORIES if any(area.category == name for area in AREAS)]
