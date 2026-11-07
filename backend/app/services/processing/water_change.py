"""Low-backscatter water-indicator masks.

Calm open water usually returns little radar energy, so a low dB threshold is a
useful *indicator*. It is not a flood classifier: dry sand, smooth surfaces,
radar shadow, steep incidence angles, and other conditions can also produce low
backscatter. The output is therefore labelled a water-indicator change, not a
flood extent.
"""

from __future__ import annotations

from dataclasses import dataclass

import numpy as np


@dataclass
class WaterChangeMasks:
    water_before: np.ndarray
    water_after: np.ndarray
    new_water: np.ndarray
    lost_water: np.ndarray
    persistent_water: np.ndarray
    valid: np.ndarray
    threshold_db: float
    method: str = "low_backscatter_water_indicator"


def detect_water_change(
    before_db: np.ndarray,
    after_db: np.ndarray,
    valid: np.ndarray,
    threshold_db: float = -17.0,
) -> WaterChangeMasks:
    if before_db.shape != after_db.shape:
        raise ValueError("Backscatter arrays must share the same shape")
    if threshold_db >= 0:
        raise ValueError("Water indicator threshold should be negative dB")

    water_before = valid & (before_db < threshold_db)
    water_after = valid & (after_db < threshold_db)
    return WaterChangeMasks(
        water_before=water_before,
        water_after=water_after,
        new_water=water_after & ~water_before,
        lost_water=water_before & ~water_after,
        persistent_water=water_before & water_after,
        valid=valid,
        threshold_db=float(threshold_db),
    )
