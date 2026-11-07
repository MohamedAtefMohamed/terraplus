"""Preprocessing and validation for paired SAR scenes."""

from __future__ import annotations

from dataclasses import dataclass

import numpy as np
from scipy import ndimage

from app.services.processing.raster_loader import RasterData


class AlignmentError(RuntimeError):
    """Raised when two rasters cannot be compared responsibly."""


@dataclass
class AlignmentReport:
    aligned: bool
    same_shape: bool
    same_crs: bool
    transform_delta: float
    pixel_size_delta: float
    notes: list[str]


def check_alignment(before: RasterData, after: RasterData) -> AlignmentReport:
    same_shape = before.array.shape == after.array.shape
    same_crs = (before.crs or "") == (after.crs or "")
    transform_delta = float(
        max(
            abs(before.transform.a - after.transform.a),
            abs(before.transform.e - after.transform.e),
            abs(before.transform.c - after.transform.c),
            abs(before.transform.f - after.transform.f),
        )
    )
    pixel_size_delta = float(
        abs(abs(before.transform.a) - abs(after.transform.a))
        + abs(abs(before.transform.e) - abs(after.transform.e))
    )
    notes: list[str] = []
    if not same_shape:
        notes.append(
            f"Raster grids differ ({before.width}x{before.height} vs {after.width}x{after.height})."
        )
    if not same_crs:
        notes.append(f"Coordinate reference systems differ ({before.crs} vs {after.crs}).")
    if transform_delta > 1e-9:
        notes.append("Geotransforms differ; sub-pixel co-registration is required.")
    aligned = same_shape and same_crs and transform_delta <= 1e-9
    return AlignmentReport(
        aligned=aligned,
        same_shape=same_shape,
        same_crs=same_crs,
        transform_delta=transform_delta,
        pixel_size_delta=pixel_size_delta,
        notes=notes,
    )


def prepare_scene(raster: RasterData, despeckle_size: int = 3) -> tuple[np.ndarray, np.ndarray]:
    """Return a speckle-suppressed dB array and its valid mask.

    A small median filter is a transparent, inexpensive speckle reducer for the
    demonstration scenes. Real NISAR workflows should use multi-looking or a
    mission-appropriate speckle filter after calibration and terrain correction.
    """
    valid = raster.valid
    if valid.sum() == 0:
        raise AlignmentError("Scene contains no valid pixels")

    filled = np.where(valid, raster.array, np.nanmedian(raster.array[valid])).astype(np.float32)
    if despeckle_size and despeckle_size >= 3:
        size = despeckle_size if despeckle_size % 2 == 1 else despeckle_size + 1
        filtered = ndimage.median_filter(filled, size=size, mode="nearest")
    else:
        filtered = filled
    return filtered.astype(np.float32), valid


def combined_valid_mask(before: RasterData, after: RasterData) -> np.ndarray:
    return before.valid & after.valid
