"""Raster colorisation and overlay rendering.

These helpers produce small PNG assets for the web map. They are presentation
artifacts derived from the analysis arrays, never standalone evidence.
"""

from __future__ import annotations

from pathlib import Path

import numpy as np
from PIL import Image

# dB stops -> RGB. Deep water through wetland, vegetation, bare soil, urban.
_DB_STOPS = np.array([-28.0, -21.0, -17.0, -13.0, -9.0, -5.0, -1.0, 4.0])
_DB_COLORS = np.array(
    [
        [8, 24, 48],
        [13, 52, 86],
        [19, 82, 110],
        [24, 104, 102],
        [43, 120, 86],
        [92, 137, 73],
        [166, 150, 86],
        [214, 190, 131],
    ],
    dtype=np.float32,
)

_NODATA_COLOR = np.array([7, 12, 20], dtype=np.uint8)


def db_to_rgb(data: np.ndarray, valid: np.ndarray) -> np.ndarray:
    """Map a dB backscatter array to an RGB uint8 image."""
    safe = np.nan_to_num(data, nan=-28.0, posinf=4.0, neginf=-28.0)
    clipped = np.clip(safe, _DB_STOPS[0], _DB_STOPS[-1])
    rgb = np.empty(clipped.shape + (3,), dtype=np.float32)
    for channel in range(3):
        rgb[..., channel] = np.interp(clipped, _DB_STOPS, _DB_COLORS[:, channel])
    image = np.clip(rgb, 0, 255).astype(np.uint8)
    image[~valid] = _NODATA_COLOR
    return image


def write_rgb_png(path: Path, rgb: np.ndarray, max_width: int = 512) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    image = Image.fromarray(rgb, mode="RGB")
    if image.width > max_width:
        height = int(image.height * (max_width / image.width))
        image = image.resize((max_width, height), Image.Resampling.LANCZOS)
    image.save(path, format="PNG", optimize=True)


def write_backscatter_preview(path: Path, data: np.ndarray, valid: np.ndarray) -> None:
    write_rgb_png(path, db_to_rgb(data, valid))


def build_water_overlay(
    new_water: np.ndarray,
    lost_water: np.ndarray,
    persistent_water: np.ndarray,
    valid: np.ndarray,
) -> np.ndarray:
    """RGBA overlay: new water in cyan, lost water in amber, stable water ghosted."""
    rgba = np.zeros(new_water.shape + (4,), dtype=np.uint8)
    rgba[persistent_water & valid] = [12, 50, 74, 52]
    rgba[new_water & valid] = [56, 189, 248, 205]
    rgba[lost_water & valid] = [251, 146, 60, 205]
    return rgba


def build_change_overlay(
    increase: np.ndarray, decrease: np.ndarray, valid: np.ndarray
) -> np.ndarray:
    """RGBA overlay for generic backscatter change."""
    rgba = np.zeros(increase.shape + (4,), dtype=np.uint8)
    rgba[increase & valid] = [45, 212, 191, 165]
    rgba[decrease & valid] = [251, 146, 60, 165]
    return rgba


def write_rgba_png(path: Path, rgba: np.ndarray, max_width: int = 768) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    image = Image.fromarray(rgba, mode="RGBA")
    if image.width > max_width:
        height = int(image.height * (max_width / image.width))
        image = image.resize((max_width, height), Image.Resampling.NEAREST)
    image.save(path, format="PNG", optimize=True)
