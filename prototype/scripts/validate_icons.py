#!/usr/bin/env python3
"""Print the section 6.5 alpha/chroma validation metrics as JSON."""

from __future__ import annotations

import argparse
import json
from pathlib import Path

import numpy as np
from PIL import Image


def validate(path: Path) -> dict[str, object]:
    with Image.open(path) as image:
        rgba_image = image.convert("RGBA")
        rgba = np.asarray(rgba_image, dtype=np.uint8)

    alpha = rgba[..., 3]
    r, g, b = (rgba[..., index].astype(np.int16) for index in range(3))
    residual = (alpha > 0) & (r > g + 60) & (b > g + 60)
    visible = alpha > 0
    ys, xs = np.where(visible)
    bbox = None if len(xs) == 0 else [int(xs.min()), int(ys.min()), int(xs.max() + 1), int(ys.max() + 1)]
    corners = [
        int(alpha[0, 0]),
        int(alpha[0, -1]),
        int(alpha[-1, 0]),
        int(alpha[-1, -1]),
    ]
    expected_square = path.name not in {"gym-card.png", "gym-card-raw.png", "lock-reference.png"}
    return {
        "file": str(path),
        "mode": "RGBA",
        "size": list(rgba_image.size),
        "size_pass": rgba_image.size == ((1024, 1024) if expected_square else rgba_image.size),
        "corner_alpha": corners,
        "corners_pass": corners == [0, 0, 0, 0] if expected_square else True,
        "residual_chroma_pixels": int(residual.sum()),
        "residual_pass": int(residual.sum()) == 0,
        "visible_pixel_count": int(visible.sum()),
        "visible_coverage": round(float(visible.mean()), 6),
        "visible_bbox": bbox,
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("paths", nargs="+", type=Path)
    args = parser.parse_args()
    for path in args.paths:
        print(json.dumps(validate(path), sort_keys=True))


if __name__ == "__main__":
    main()
