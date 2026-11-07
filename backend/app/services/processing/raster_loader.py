"""Safe loading of single-band georeferenced rasters."""

from __future__ import annotations

import math
from dataclasses import dataclass, field
from pathlib import Path

import numpy as np
import rasterio
from rasterio.enums import Resampling
from rasterio.errors import RasterioError
from rasterio.transform import Affine


class RasterLoadError(RuntimeError):
    """Raised when a raster is missing, unreadable or scientifically unusable."""


@dataclass
class RasterData:
    path: Path
    array: np.ndarray
    valid: np.ndarray
    transform: rasterio.Affine
    crs: str | None
    bounds: tuple[float, float, float, float]
    width: int
    height: int
    nodata: float | None
    tags: dict[str, str] = field(default_factory=dict)
    band_description: str | None = None

    @property
    def pixel_area_degrees2(self) -> float:
        return abs(self.transform.a * self.transform.e)


def load_raster(path: str | Path, band: int = 1, max_pixels: int = 4_000_000) -> RasterData:
    raster_path = Path(path)
    if not raster_path.exists():
        raise RasterLoadError(f"Raster not found: {raster_path.name}")
    if raster_path.suffix.lower() not in {".tif", ".tiff", ".vrt", ".img"}:
        raise RasterLoadError(f"Unsupported raster format: {raster_path.suffix}")

    try:
        with rasterio.open(raster_path) as dataset:
            if dataset.count < 1:
                raise RasterLoadError("Raster has no bands")
            if band > dataset.count:
                raise RasterLoadError("Requested band does not exist")

            out_height, out_width = dataset.height, dataset.width
            transform = dataset.transform
            source_pixels = dataset.width * dataset.height
            if max_pixels and source_pixels > max_pixels:
                scale = math.sqrt(max_pixels / source_pixels)
                out_width = max(2, int(dataset.width * scale))
                out_height = max(2, int(dataset.height * scale))
                raw = dataset.read(
                    band,
                    out_shape=(out_height, out_width),
                    resampling=Resampling.average,
                ).astype(np.float32)
                transform = dataset.transform * Affine.scale(
                    dataset.width / out_width, dataset.height / out_height
                )
            else:
                raw = dataset.read(band).astype(np.float32)

            nodata = dataset.nodata
            valid = np.isfinite(raw)
            if nodata is not None and np.isfinite(nodata):
                valid &= ~np.isclose(raw, nodata)
            # Guard against obviously non-physical fill values in unlabelled rasters.
            valid &= raw > -200.0
            valid &= raw < 200.0
            if valid.sum() < raw.size * 0.05:
                raise RasterLoadError("Raster has insufficient valid pixels (<5%)")

            return RasterData(
                path=raster_path,
                array=raw,
                valid=valid,
                transform=transform,
                crs=dataset.crs.to_string() if dataset.crs else None,
                bounds=tuple(dataset.bounds),
                width=out_width,
                height=out_height,
                nodata=nodata,
                tags={str(k): str(v) for k, v in (dataset.tags() or {}).items()},
                band_description=dataset.descriptions[band - 1] if dataset.descriptions else None,
            )
    except RasterLoadError:
        raise
    except (RasterioError, OSError, ValueError) as exc:
        raise RasterLoadError(f"Unable to read raster: {exc}") from exc
