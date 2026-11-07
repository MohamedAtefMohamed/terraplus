"""Measurement normalisation helpers."""

from __future__ import annotations

import numpy as np


def power_to_db(power: np.ndarray, floor: float = 1e-6) -> np.ndarray:
    return 10.0 * np.log10(np.clip(power, floor, None))


def db_to_power(db: np.ndarray) -> np.ndarray:
    return np.power(10.0, db / 10.0)


def ratio_db(before_db: np.ndarray, after_db: np.ndarray) -> np.ndarray:
    """Ratio of calibrated linear powers expressed in decibels.

    For calibrated backscatter this equals ``after_db - before_db``; the
    explicit ratio path is kept because it documents the physical operation.
    """
    before_power = db_to_power(before_db)
    after_power = db_to_power(after_db)
    return power_to_db(after_power / np.clip(before_power, 1e-6, None))


def clamp_db(db: np.ndarray, minimum: float = -40.0, maximum: float = 15.0) -> np.ndarray:
    return np.clip(db, minimum, maximum)
