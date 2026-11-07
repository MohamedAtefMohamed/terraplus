"""Processing-quality indicators and honest limitations."""

from __future__ import annotations

import numpy as np

from app.services.processing.preprocessing import AlignmentReport


def assess_quality(
    diff_db: np.ndarray,
    valid: np.ndarray,
    alignment: AlignmentReport,
    threshold_db: float,
    coverage: float,
) -> dict:
    all_diff = diff_db[valid]
    stable_mask = valid & (np.abs(diff_db) <= threshold_db)
    stable_diff = diff_db[stable_mask]
    diff = stable_diff if stable_diff.size >= max(100, int(all_diff.size * 0.1)) else all_diff
    if diff.size == 0:
        mad = float("nan")
    else:
        median = float(np.median(diff))
        mad = float(np.median(np.abs(diff - median)) * 1.4826)

    noise_score = float(np.clip(1.0 - (mad / 4.0), 0.0, 1.0))
    alignment_score = 1.0 if alignment.aligned else 0.0
    coverage_score = float(np.clip(coverage, 0.0, 1.0))
    score = round(0.5 * coverage_score + 0.3 * noise_score + 0.2 * alignment_score, 3)

    if score >= 0.8:
        label = "High"
    elif score >= 0.55:
        label = "Moderate"
    else:
        label = "Low"

    flags: list[str] = []
    if not alignment.aligned:
        flags.append(
            "Scenes are not on an identical grid; comparison should be treated as indicative only."
        )
    if coverage < 0.9:
        flags.append("Valid-pixel coverage is below 90%; statistics cover only the valid overlap.")
    if mad > 2.0:
        flags.append("Residual speckle/noise is relatively high for the configured threshold.")
    else:
        flags.append("Residual difference noise is low relative to the configured threshold.")
    if score >= 0.8:
        flags.append("Processing geometry and coverage are strong for this demonstration dataset.")

    return {
        "score": score,
        "label": label,
        "score_meaning": (
            "Composite processing-quality score from valid-pixel coverage, residual "
            "difference noise (MAD) and grid alignment. It describes the comparison "
            "quality, not the probability that an environmental event occurred."
        ),
        "difference_noise_db": round(mad, 3) if np.isfinite(mad) else None,
        "threshold_db": threshold_db,
        "alignment": {
            "aligned": alignment.aligned,
            "same_shape": alignment.same_shape,
            "same_crs": alignment.same_crs,
            "transform_delta": alignment.transform_delta,
            "notes": alignment.notes,
        },
        "flags": flags,
    }


BASE_LIMITATIONS = [
    "This is not a flood map, emergency product or ground-truth-validated hazard assessment.",
    "A radar backscatter change does not identify a cause. Surface roughness, vegetation, soil moisture, inundation, tillage, snow and acquisition geometry can all change the signal.",
    "The ± dB and water-indicator thresholds are configurable screening parameters, not universal scientific constants.",
    "Single-polarisation VV backscatter is used; cross-polarisation and incidence-angle normalisation are not applied in this MVP.",
    "Speckle is reduced with a small median filter. Production workflows should use mission-calibrated, terrain-corrected products and a validated speckle filter.",
    "No external validation dataset (optical imagery, gauge data or field reports) is used; confidence refers to processing quality only.",
]

SYNTHETIC_LIMITATIONS = [
    "The demonstration backscatter scenes are synthetic. Coordinates and footprints are real, but no pixel is an actual NISAR, Sentinel-1 or other satellite measurement.",
    "Synthetic water-fraction trajectories are illustrative and must not be cited as evidence of a real environmental event.",
]


def build_limitations(is_synthetic: bool, extra: list[str] | None = None) -> list[str]:
    limitations = list(BASE_LIMITATIONS)
    if is_synthetic:
        limitations = SYNTHETIC_LIMITATIONS + limitations
    if extra:
        limitations.extend(extra)
    return limitations
