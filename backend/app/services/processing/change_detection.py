"""Explainable, threshold-based backscatter change detection."""

from __future__ import annotations

from dataclasses import dataclass

import numpy as np


@dataclass
class ChangeMasks:
    diff_db: np.ndarray
    increase: np.ndarray
    decrease: np.ndarray
    stable: np.ndarray
    valid: np.ndarray
    threshold_db: float
    method: str = "backscatter_difference_db"


def detect_backscatter_change(
    before_db: np.ndarray,
    after_db: np.ndarray,
    valid: np.ndarray,
    threshold_db: float = 3.0,
) -> ChangeMasks:
    """Classify pixel-level change using a symmetric dB threshold.

    The threshold is a configurable screening parameter, not a universal
    scientific constant. A change in dB is a relative radiometric difference;
    it is not, by itself, evidence of flooding or any specific cause.
    """
    if before_db.shape != after_db.shape:
        raise ValueError("Backscatter arrays must share the same shape")
    if threshold_db <= 0:
        raise ValueError("Change threshold must be positive")

    diff = (after_db - before_db).astype(np.float32)
    increase = valid & (diff > threshold_db)
    decrease = valid & (diff < -threshold_db)
    stable = valid & ~increase & ~decrease
    return ChangeMasks(
        diff_db=diff,
        increase=increase,
        decrease=decrease,
        stable=stable,
        valid=valid,
        threshold_db=float(threshold_db),
    )
