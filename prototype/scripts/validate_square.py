#!/usr/bin/env python3
"""Family E (composed square) validation gates — see design/STYLE.md section 1.

Family A/B assets are keyed cutouts and are checked by validate_icons.py. A
composed square is the opposite shape of problem: it must be fully opaque,
exactly square, painted in the declared background color, and carry its subject
inside the safe area that iOS's superellipse mask leaves untouched.

Exits non-zero if any gate fails, so it can be used as the pipeline's test.
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image

# iOS masks the icon to a superellipse. Anything closer to the edge than this
# fraction of the side risks being clipped on device even though the 1024 PNG
# looks fine in a file browser.
SAFE_INSET_FRACTION = 0.08

# A subject smaller than this reads as a speck at 60x60pt; larger than this and
# the mask starts eating it. Both failures are invisible at 1024px.
MIN_SUBJECT_FRACTION = 0.28
MAX_SUBJECT_FRACTION = 0.72

# The subject should sit on the optical center. Allow a little slack for
# glyphs whose visual weight is not their geometric center.
MAX_CENTER_DRIFT_FRACTION = 0.03


def _hex_to_rgb(value: str) -> tuple[int, int, int]:
    cleaned = value.lstrip("#")
    if len(cleaned) != 6:
        raise ValueError(f"expected a 6-digit hex color, got {value!r}")
    return tuple(int(cleaned[i : i + 2], 16) for i in (0, 2, 4))  # type: ignore[return-value]


def validate(
    path: Path, size: int, background: str | None, expect_mode: str = "RGB"
) -> dict[str, object]:
    with Image.open(path) as image:
        mode = image.mode
        width, height = image.size
        rgb = np.asarray(image.convert("RGB"), dtype=np.int16)
        alpha = np.asarray(image.convert("RGBA"), dtype=np.uint8)[..., 3]

    failures: list[str] = []

    if (width, height) != (size, size):
        failures.append(f"expected {size}x{size}, got {width}x{height}")

    # Apple rejects app icons that carry an alpha channel at all — not merely
    # ones that are visually opaque.
    if mode != expect_mode:
        failures.append(f"expected mode {expect_mode}, got {mode}")

    corners = [
        tuple(int(v) for v in rgb[0, 0]),
        tuple(int(v) for v in rgb[0, -1]),
        tuple(int(v) for v in rgb[-1, 0]),
        tuple(int(v) for v in rgb[-1, -1]),
    ]

    if background is not None:
        expected = _hex_to_rgb(background)
        for name, corner in zip(("tl", "tr", "bl", "br"), corners):
            if corner != expected:
                failures.append(f"corner {name} is {corner}, expected {expected} for {background}")

    # Carried over from the magenta pipeline: a despill miss shows up as pixels
    # that are strongly magenta. Orange backgrounds never trip this.
    r, g, b = (rgb[..., index] for index in range(3))
    residual_chroma = int(((r > g + 60) & (b > g + 60)).sum())
    if residual_chroma:
        failures.append(f"{residual_chroma} residual chroma-key pixels")

    # On an opaque square the subject is whatever is not the background color;
    # on a transparent one (the splash logo) it is whatever has alpha.
    if background is not None:
        expected_arr = np.array(_hex_to_rgb(background), dtype=np.int16)
        subject_mask = np.abs(rgb - expected_arr).sum(axis=2) > 24
    else:
        subject_mask = alpha > 8

    bbox = None
    coverage = 0.0
    inset = None
    drift = None
    if subject_mask.any():
        ys, xs = np.nonzero(subject_mask)
        bbox = [int(xs.min()), int(ys.min()), int(xs.max() + 1), int(ys.max() + 1)]
        coverage = float(subject_mask.mean())

        inset = min(bbox[0], bbox[1], width - bbox[2], height - bbox[3]) / size
        if inset < SAFE_INSET_FRACTION:
            failures.append(
                f"subject inset {inset:.3f} is inside the {SAFE_INSET_FRACTION} safe area"
            )

        span = max(bbox[2] - bbox[0], bbox[3] - bbox[1]) / size
        if not MIN_SUBJECT_FRACTION <= span <= MAX_SUBJECT_FRACTION:
            failures.append(
                f"subject spans {span:.3f} of the side, outside "
                f"[{MIN_SUBJECT_FRACTION}, {MAX_SUBJECT_FRACTION}]"
            )

        cx = (bbox[0] + bbox[2]) / 2 / size
        cy = (bbox[1] + bbox[3]) / 2 / size
        drift = max(abs(cx - 0.5), abs(cy - 0.5))
        if drift > MAX_CENTER_DRIFT_FRACTION:
            failures.append(f"subject center drifts {drift:.3f} from center")
    else:
        failures.append("no subject found — the square is empty")

    return {
        "path": str(path),
        "mode": mode,
        "size": [width, height],
        "corners": corners,
        "residual_chroma": residual_chroma,
        "subject_bbox": bbox,
        "subject_coverage": round(coverage, 4),
        "subject_inset": None if inset is None else round(inset, 4),
        "center_drift": None if drift is None else round(drift, 4),
        "failures": failures,
        "passed": not failures,
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("path", type=Path)
    parser.add_argument("--size", type=int, default=1024)
    parser.add_argument("--background", default=None, help="expected background hex, e.g. #F25A16")
    parser.add_argument("--expect-mode", default="RGB", help="RGB for icons, RGBA for splash logos")
    args = parser.parse_args()

    report = validate(args.path, args.size, args.background, args.expect_mode)
    print(json.dumps(report, indent=2))
    return 0 if report["passed"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
