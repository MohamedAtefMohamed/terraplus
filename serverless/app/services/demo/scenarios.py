"""Illustrative demo scenarios.

Every scene produced from these definitions is SYNTHETIC. The geography and
coordinate bounds are real, the radar backscatter is not. Nothing here is a
real NISAR, Sentinel-1 or other mission acquisition, and nothing here should be
read as a statement about an actual flood or environmental event.
"""

from __future__ import annotations

from dataclasses import dataclass, field


@dataclass(frozen=True)
class DemoScenario:
    slug: str
    name: str
    country: str
    region: str
    focus: str
    scenario: str
    description: str
    monitoring_note: str
    bbox: list[float]  # [west, south, east, north] in EPSG:4326
    dates: list[str]
    water_fractions: list[float]
    seed: int
    noise_sigma: float = 16.0
    fine_weight: float = 0.32
    river_width: float = 0.018
    river_points: list[tuple[float, float]] = field(default_factory=list)
    coast: bool = False
    coast_base: float = 0.9
    coast_amplitude: float = 0.03

    @property
    def center_lon(self) -> float:
        return (self.bbox[0] + self.bbox[2]) / 2

    @property
    def center_lat(self) -> float:
        return (self.bbox[1] + self.bbox[3]) / 2


DEMO_SCENARIOS: list[DemoScenario] = [
    DemoScenario(
        slug="sundarbans",
        name="Sundarbans Delta",
        country="Bangladesh / India",
        region="Ganges-Brahmaputra Delta",
        focus="Flood & wetland change",
        scenario="Monsoon water expansion",
        description=(
            "A tidal delta dominated by mangrove forest, distributary channels and "
            "seasonal flooding. The demonstration sequence explores how a rising "
            "monsoon signal can appear in radar backscatter."
        ),
        monitoring_note=(
            "Illustrative scenario generated for TerraPulse. It is not an actual "
            "flood event and does not use real NISAR or Sentinel-1 pixels."
        ),
        bbox=[88.96, 21.76, 89.42, 22.10],
        dates=[
            "2025-05-18T06:14:00Z",
            "2025-06-27T06:14:00Z",
            "2025-08-14T06:14:00Z",
            "2025-10-03T06:14:00Z",
        ],
        water_fractions=[0.24, 0.33, 0.52, 0.31],
        seed=11,
        noise_sigma=15.0,
        fine_weight=0.30,
        river_width=0.016,
        river_points=[
            (0.32, 0.0),
            (0.40, 0.22),
            (0.36, 0.43),
            (0.46, 0.62),
            (0.43, 0.81),
            (0.50, 1.0),
        ],
        coast=True,
        coast_base=0.91,
        coast_amplitude=0.035,
    ),
    DemoScenario(
        slug="atchafalaya",
        name="Atchafalaya Basin",
        country="United States",
        region="Louisiana Gulf Coast",
        focus="Wetland & water change",
        scenario="Coastal wetland water variability",
        description=(
            "A low-relief coastal basin with marsh, swamp forest, levees and many "
            "small water bodies. The demo highlights why small, fragmented changes "
            "require careful interpretation in radar imagery."
        ),
        monitoring_note=(
            "Illustrative scenario generated for TerraPulse. Wetland fragmentation "
            "patterns and water fractions are synthetic."
        ),
        bbox=[-91.60, 29.52, -91.16, 29.83],
        dates=[
            "2025-03-12T12:05:00Z",
            "2025-06-05T12:05:00Z",
            "2025-09-09T12:05:00Z",
            "2025-11-01T12:05:00Z",
        ],
        water_fractions=[0.32, 0.40, 0.47, 0.36],
        seed=29,
        noise_sigma=10.0,
        fine_weight=0.56,
        river_width=0.014,
        river_points=[
            (0.18, 0.0),
            (0.30, 0.18),
            (0.24, 0.36),
            (0.38, 0.55),
            (0.33, 0.74),
            (0.46, 1.0),
        ],
        coast=True,
        coast_base=0.88,
        coast_amplitude=0.05,
    ),
    DemoScenario(
        slug="mekong",
        name="Mekong Delta",
        country="Vietnam",
        region="Lower Mekong Basin",
        focus="Flood & wetland change",
        scenario="Seasonal delta inundation",
        description=(
            "A densely cultivated delta with distributary channels and strong "
            "seasonal hydrology. The demonstration illustrates large-area change "
            "detection across mixed land and water surfaces."
        ),
        monitoring_note=(
            "Illustrative scenario generated for TerraPulse. It is not an actual "
            "Mekong flood observation."
        ),
        bbox=[105.82, 9.92, 106.28, 10.26],
        dates=[
            "2025-04-08T05:48:00Z",
            "2025-07-19T05:48:00Z",
            "2025-09-23T05:48:00Z",
            "2025-11-12T05:48:00Z",
        ],
        water_fractions=[0.30, 0.42, 0.58, 0.38],
        seed=47,
        noise_sigma=14.0,
        fine_weight=0.34,
        river_width=0.020,
        river_points=[
            (0.10, 0.0),
            (0.22, 0.16),
            (0.20, 0.33),
            (0.34, 0.50),
            (0.31, 0.68),
            (0.44, 0.84),
            (0.42, 1.0),
        ],
        coast=True,
        coast_base=0.93,
        coast_amplitude=0.025,
    ),
]


def get_scenario(slug: str) -> DemoScenario | None:
    return next((scenario for scenario in DEMO_SCENARIOS if scenario.slug == slug), None)
