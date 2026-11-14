"""Live SAR change detection using public Sentinel-1 GRD cloud-optimized GeoTIFFs.

Sentinel-1 C-band scenes are distributed through the AWS Open Data registry and
the Element 84 Earth Search STAC API. Reads are windowed and decimated, so only
the pixels inside the requested AOI travel over the network.
"""

from __future__ import annotations

import hashlib
import json
import math
import time
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

import httpx
import numpy as np

from app.core.config import get_settings

STAC_SEARCH_URL = "https://earth-search.aws.element84.com/v1"
COLLECTION = "sentinel-1-grd"
S1_BUCKET_HTTPS = "https://sentinel-s1-l1c.s3.amazonaws.com"

_USER_AGENT = "TerraPulse/1.0 (NASA Space Apps Challenge; live SAR change)"


class LiveChangeError(RuntimeError):
    pass


def _normalize_scene(feature: dict[str, Any]) -> dict[str, Any]:
    props = feature.get("properties") or {}
    assets = feature.get("assets") or {}
    vv = (assets.get("vv") or {}).get("href")
    vh = (assets.get("vh") or {}).get("href")
    thumbnail = (assets.get("thumbnail") or {}).get("href")
    return {
        "id": feature.get("id"),
        "datetime": props.get("datetime"),
        "relative_orbit": props.get("sat:relative_orbit"),
        "orbit_state": props.get("sat:orbit_state"),
        "platform": "Sentinel-1",
        "instrument_mode": props.get("sar:instrument_mode"),
        "polarizations": props.get("sar:polarizations") or [],
        "resolution_m": props.get("sar:resolution_range"),
        "vv_href": vv,
        "vh_href": vh,
        "thumbnail_href": thumbnail,
        "footprint": (feature.get("geometry") or {}).get("coordinates"),
    }


def search_scenes(bbox: list[float], days: int = 90, limit: int = 80) -> list[dict[str, Any]]:
    days = max(7, min(days, 365))
    end = datetime.now(UTC)
    body = {
        "collections": [COLLECTION],
        "bbox": bbox,
        "limit": max(1, min(limit, 100)),
        "datetime": f"{datetime.fromtimestamp(end.timestamp() - days * 86400, UTC).isoformat()}/{end.isoformat()}",
        "query": {"sar:instrument_mode": {"eq": "IW"}},
    }
    try:
        with httpx.Client(timeout=30.0, follow_redirects=True) as client:
            response = client.post(
                f"{STAC_SEARCH_URL}/search",
                json=body,
                headers={"User-Agent": _USER_AGENT, "Accept": "application/json"},
            )
    except Exception as exc:  # noqa: BLE001
        raise LiveChangeError("Could not reach the Earth Search STAC API.") from exc
    if response.status_code >= 400:
        raise LiveChangeError(f"Earth Search returned HTTP {response.status_code}.")
    features = (response.json() or {}).get("features") or []
    scenes = [_normalize_scene(feature) for feature in features]
    return [scene for scene in scenes if scene.get("vv_href")]


def pick_pair(scenes: list[dict[str, Any]]) -> tuple[dict[str, Any], dict[str, Any]]:
    """Choose two acquisitions from the same relative orbit, closest to the 12-day repeat."""
    groups: dict[tuple[Any, Any], list[dict[str, Any]]] = {}
    for scene in scenes:
        if not scene.get("datetime"):
            continue
        key = (scene.get("relative_orbit"), scene.get("orbit_state"))
        groups.setdefault(key, []).append(scene)

    best: tuple[dict[str, Any], dict[str, Any]] | None = None
    best_score = math.inf
    for rows in groups.values():
        if len(rows) < 2:
            continue
        rows.sort(key=lambda item: item["datetime"], reverse=True)
        after = rows[0]
        after_dt = datetime.fromisoformat(after["datetime"].replace("Z", "+00:00"))
        for candidate in rows[1:]:
            before_dt = datetime.fromisoformat(candidate["datetime"].replace("Z", "+00:00"))
            gap_days = (after_dt - before_dt).total_seconds() / 86400
            if gap_days < 3:
                continue
            score = abs(gap_days - 12)
            if score < best_score:
                best_score = score
                best = (candidate, after)
            break
    if best is None:
        raise LiveChangeError(
            "No same-track Sentinel-1 pair with a usable gap was found for this area yet. "
            "Try a larger window of days or a different area."
        )
    return best


def _to_https(href: str) -> str:
    if href.startswith("s3://"):
        bucket, _, key = href[5:].partition("/")
        return f"https://{bucket}.s3.amazonaws.com/{key}"
    return href


def _cache_key(bbox: list[float], before_id: str, after_id: str, threshold: float) -> str:
    raw = json.dumps(
        {"bbox": [round(v, 6) for v in bbox], "before": before_id, "after": after_id, "thr": threshold},
        sort_keys=True,
    )
    return hashlib.sha1(raw.encode()).hexdigest()[:16]


def _read_grid(href: str, bbox: list[float], size: int) -> np.ndarray:
    import rasterio
    from rasterio.enums import Resampling
    from rasterio.vrt import WarpedVRT

    url = _to_https(href)
    with rasterio.Env(
        GDAL_DISABLE_READDIR_ON_OPEN="EMPTY_DIR",
        GDAL_HTTP_MULTIRANGE="YES",
        GDAL_HTTP_MERGE_CONSECUTIVE_RANGES="YES",
        CPL_VSIL_CURL_ALLOWED_EXTENSIONS=".tif,.tiff",
    ):
        with rasterio.open(url) as dataset:
            # Sentinel-1 GRD COGs carry GCP geolocation and an identity transform,
            # so a WarpedVRT is the reliable way to address them in lon/lat.
            with WarpedVRT(
                dataset,
                crs="EPSG:4326",
                resampling=Resampling.average,
                src_nodata=0,
                nodata=np.nan,
            ) as vrt:
                window = vrt.window(*bbox).round_offsets().round_lengths()
                col_off = max(0, int(window.col_off))
                row_off = max(0, int(window.row_off))
                width = min(vrt.width - col_off, int(window.width))
                height = min(vrt.height - row_off, int(window.height))
                if width <= 8 or height <= 8:
                    raise LiveChangeError("The area of interest falls outside this scene.")
                from rasterio.windows import Window

                data = vrt.read(
                    1,
                    window=Window(col_off, row_off, width, height),
                    out_shape=(size, size),
                    resampling=Resampling.average,
                )
    return data.astype("float32")


def _dn_to_db(dn: np.ndarray) -> np.ndarray:
    power = np.square(dn.astype("float64"))
    with np.errstate(divide="ignore", invalid="ignore"):
        db = 10.0 * np.log10(power)
    db[~np.isfinite(db)] = np.nan
    return db.astype("float32")


def _median3(arr: np.ndarray) -> np.ndarray:
    from scipy import ndimage

    valid = np.isfinite(arr)
    if valid.sum() < 16:
        return arr
    filled = np.where(valid, arr, np.nanmedian(arr))
    smoothed = ndimage.median_filter(filled, size=3, mode="nearest")
    out = smoothed.astype("float32")
    out[~valid] = np.nan
    return out


def _otsu(values: np.ndarray, bins: int = 128) -> float:
    flat = values[np.isfinite(values)]
    if flat.size < 64:
        return -17.0
    hist, edges = np.histogram(flat, bins=bins)
    hist = hist.astype("float64")
    total = hist.sum()
    if total <= 0:
        return -17.0
    centers = (edges[:-1] + edges[1:]) / 2
    weight_bg = np.cumsum(hist)
    weight_fg = total - weight_bg
    mean_bg = np.cumsum(hist * centers)
    mean_total = mean_bg[-1]
    with np.errstate(divide="ignore", invalid="ignore"):
        between = (mean_total * weight_bg / total - mean_bg) ** 2 / (weight_bg * weight_fg / total)
    between[~np.isfinite(between)] = -1
    threshold = float(centers[int(np.argmax(between))])
    lo, hi = np.percentile(flat, [2, 98])
    return float(min(hi, max(lo, threshold)))


def _stretch_png(arr: np.ndarray, path: Path) -> None:
    from PIL import Image

    valid = np.isfinite(arr)
    if valid.sum() == 0:
        data = np.zeros(arr.shape, dtype="uint8")
    else:
        lo, hi = np.nanpercentile(arr[valid], [2, 98])
        if hi - lo < 1e-6:
            hi = lo + 1.0
        scaled = np.clip((arr - lo) / (hi - lo), 0, 1)
        data = np.where(valid, scaled, 0.04)
        data = (data * 255).astype("uint8")
    Image.fromarray(data, mode="L").resize((512, 512), Image.Resampling.BILINEAR).save(path)


def _diff_png(
    delta: np.ndarray, gain: np.ndarray, loss: np.ndarray, changed: np.ndarray, path: Path
) -> None:
    from PIL import Image

    valid = np.isfinite(delta)
    base = np.zeros(delta.shape, dtype="float32")
    if valid.any():
        lo, hi = np.nanpercentile(np.abs(delta[valid]), [50, 99.5])
        hi = max(hi, 1.0)
        base = np.clip(np.abs(delta) / hi, 0, 1)
    rgb = np.zeros((*delta.shape, 3), dtype="float32")
    rgb[..., 0] = base * 0.30
    rgb[..., 1] = base * 0.34
    rgb[..., 2] = base * 0.42
    other = changed & ~gain & ~loss
    rgb[gain] = (0.13, 0.55, 0.98)
    rgb[loss] = (0.98, 0.45, 0.16)
    rgb[other] = (0.55, 0.42, 0.98)
    data = (np.clip(rgb, 0, 1) * 255).astype("uint8")
    Image.fromarray(data, mode="RGB").resize((512, 512), Image.Resampling.BILINEAR).save(path)


def _polygonize(
    mask: np.ndarray, kind: str, transform: Any, limit: int = 24
) -> list[dict[str, Any]]:
    import rasterio.features
    from shapely.geometry import mapping, shape
    from shapely.ops import unary_union

    if not mask.any():
        return []
    shapes = [
        {"geometry": geom, "properties": {"kind": kind}}
        for geom, value in rasterio.features.shapes(
            mask.astype("uint8"), mask=mask, transform=transform
        )
        if value == 1
    ]
    ranked = sorted(
        shapes,
        key=lambda item: _area(shape(item["geometry"])),
        reverse=True,
    )[:limit]
    features = []
    for item in ranked:
        geom = _simplify(shape(item["geometry"]))
        if geom.is_empty:
            continue
        features.append(
            {
                "type": "Feature",
                "properties": item["properties"],
                "geometry": mapping(geom),
            }
        )
    return features


def _area(geom: Any) -> float:
    return float(geom.area)


def _simplify(geom: Any) -> Any:
    try:
        simplified = geom.simplify(0.0007, preserve_topology=True)
        return simplified if not simplified.is_empty else geom
    except Exception:  # noqa: BLE001
        return geom


def compute_change(
    bbox: list[float],
    days: int = 90,
    threshold_db: float = 3.0,
    grid_size: int = 512,
    force: bool = False,
) -> dict[str, Any]:
    if not (len(bbox) == 4 and bbox[0] < bbox[2] and bbox[1] < bbox[3]):
        raise LiveChangeError("Invalid bounding box. Expected [west, south, east, north].")

    started = time.time()
    scenes = search_scenes(bbox, days=days)
    if not scenes:
        raise LiveChangeError(
            "No Sentinel-1 scenes intersect this area in the selected window."
        )
    before, after = pick_pair(scenes)
    key = _cache_key(bbox, before["id"], after["id"], threshold_db)

    settings = get_settings()
    out_dir = settings.media_dir / "live" / key
    result_path = out_dir / "result.json"
    if result_path.exists() and not force:
        age = time.time() - result_path.stat().st_mtime
        if age < settings.live_cache_ttl_seconds:
            cached = json.loads(result_path.read_text())
            cached["cached"] = True
            return cached

    out_dir.mkdir(parents=True, exist_ok=True)
    before_db = _median3(_dn_to_db(_read_grid(before["vv_href"], bbox, grid_size)))
    after_db = _median3(_dn_to_db(_read_grid(after["vv_href"], bbox, grid_size)))

    valid = np.isfinite(before_db) & np.isfinite(after_db)
    if valid.sum() < 256:
        raise LiveChangeError("Too few overlapping valid pixels to compare these two scenes.")

    delta = np.where(valid, after_db - before_db, np.nan)
    water_threshold = _otsu(np.concatenate([before_db[valid], after_db[valid]]))
    before_water = valid & (before_db < water_threshold)
    after_water = valid & (after_db < water_threshold)
    changed = valid & (np.abs(delta) > threshold_db)
    gain = after_water & ~before_water
    loss = before_water & ~after_water

    from rasterio.transform import from_bounds

    dst_transform = from_bounds(*bbox, grid_size, grid_size)

    _stretch_png(before_db, out_dir / "before.png")
    _stretch_png(after_db, out_dir / "after.png")
    _diff_png(delta, gain, loss, changed, out_dir / "change.png")

    def inline(name: str) -> str:
        import base64

        data = (out_dir / name).read_bytes()
        return "data:image/png;base64," + base64.b64encode(data).decode("ascii")

    features = []
    features += _polygonize(gain, "water_gain", dst_transform)
    features += _polygonize(loss, "water_loss", dst_transform)
    features += _polygonize(changed & ~gain & ~loss, "backscatter_change", dst_transform)

    valid_count = int(valid.sum())
    result = {
        "ok": True,
        "cached": False,
        "key": key,
        "bbox": bbox,
        "grid_size": grid_size,
        "before": {k: before[k] for k in ("id", "datetime", "relative_orbit", "orbit_state", "polarizations")},
        "after": {k: after[k] for k in ("id", "datetime", "relative_orbit", "orbit_state", "polarizations")},
        "gap_days": round(
            (
                datetime.fromisoformat(after["datetime"].replace("Z", "+00:00"))
                - datetime.fromisoformat(before["datetime"].replace("Z", "+00:00"))
            ).total_seconds()
            / 86400,
            1,
        ),
        "method": {
            "sensor": "Sentinel-1 C-band GRD (VV)",
            "policy": "relative backscatter, decimated 512 px grid, 3x3 median speckle screen",
            "change_threshold_db": threshold_db,
            "water_threshold_db": round(water_threshold, 2),
            "water_threshold_method": "Otsu split of the pooled dB histogram",
        },
        "stats": {
            "valid_fraction": round(valid_count / (grid_size * grid_size), 4),
            "changed_fraction": round(float(changed.sum()) / valid_count, 4),
            "water_before_fraction": round(float(before_water.sum()) / valid_count, 4),
            "water_after_fraction": round(float(after_water.sum()) / valid_count, 4),
            "water_gain_fraction": round(float(gain.sum()) / valid_count, 4),
            "water_loss_fraction": round(float(loss.sum()) / valid_count, 4),
        },
        "media": {
            "before": f"/media/live/{key}/before.png",
            "after": f"/media/live/{key}/after.png",
            "change": f"/media/live/{key}/change.png",
        },
        # Vercel functions are ephemeral; inline copies guarantee the images render
        # even when the follow-up request lands on a different instance.
        "media_inline": {
            "before": inline("before.png"),
            "after": inline("after.png"),
            "change": inline("change.png"),
        },
        "geojson": {"type": "FeatureCollection", "features": features},
        "provenance": {
            "catalog": "Element 84 Earth Search STAC · AWS Open Data Sentinel-1",
            "bucket": "sentinel-s1-l1c",
            "stac_collection": COLLECTION,
            "read_policy": "windowed decimated reads over HTTPS (COG range requests)",
        },
        "limitations": (
            "C-band Sentinel-1 bridge until NISAR L-band products are analysis-ready. "
            "Backscatter is relative (no absolute radiometric calibration applied). "
            "Water masks are a screening signal, not a flood map."
        ),
        "computed_at": datetime.now(UTC).isoformat(),
        "elapsed_seconds": round(time.time() - started, 1),
    }
    result_path.write_text(json.dumps(result, default=float))
    return result


def available_scenes(bbox: list[float], days: int = 90) -> dict[str, Any]:
    scenes = search_scenes(bbox, days=days)
    pair = None
    pair_error = None
    try:
        before, after = pick_pair(scenes)
        pair = {
            "before": {k: before[k] for k in ("id", "datetime", "relative_orbit", "orbit_state")},
            "after": {k: after[k] for k in ("id", "datetime", "relative_orbit", "orbit_state")},
        }
    except LiveChangeError as exc:
        pair_error = str(exc)
    return {
        "ok": True,
        "count": len(scenes),
        "pair": pair,
        "pair_error": pair_error,
        "items": scenes[:30],
        "source": "Element 84 Earth Search STAC · Sentinel-1 GRD",
    }