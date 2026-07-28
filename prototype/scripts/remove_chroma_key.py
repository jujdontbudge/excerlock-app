#!/usr/bin/env python3
"""Remove a flat magenta #FF00FF foundry backdrop from an opaque PNG."""

from __future__ import annotations

import argparse
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("input", type=Path)
    parser.add_argument("output", type=Path)
    parser.add_argument("--edge-contract", type=int, default=1)
    parser.add_argument("--despill", action="store_true")
    return parser.parse_args()


def key_image(source: Image.Image, *, despill: bool, edge_contract: int) -> Image.Image:
    rgba = np.asarray(source.convert("RGBA"), dtype=np.uint8).copy()
    rgb = rgba[..., :3].astype(np.float32)
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]

    # Exact/near-exact foundry field.
    hard_key = (r > 180) & (b > 180) & (g < 110)

    # Smooth the generated anti-aliased transition from subject to magenta.
    magenta_excess = np.minimum(r - g, b - g)
    graded_key = (magenta_excess > 28) & (g < 185)
    alpha = np.full(r.shape, 255.0, dtype=np.float32)
    ramp = np.clip((110.0 - magenta_excess) / 82.0, 0.0, 1.0) * 255.0
    alpha[graded_key] = np.minimum(alpha[graded_key], ramp[graded_key])
    alpha[hard_key] = 0.0

    if despill:
        visible = alpha > 0
        spill = np.clip(magenta_excess - 8.0, 0.0, 255.0)
        strength = np.clip(spill / 95.0, 0.0, 1.0) * (1.0 - alpha / 255.0 * 0.65)
        neutral = np.maximum(g, np.minimum(r, b))
        rgb[..., 0] = np.where(visible, r * (1.0 - strength) + neutral * strength, r)
        rgb[..., 2] = np.where(visible, b * (1.0 - strength) + neutral * strength, b)

    rgba[..., :3] = np.clip(rgb, 0, 255).astype(np.uint8)
    rgba[..., 3] = np.clip(alpha, 0, 255).astype(np.uint8)
    output = Image.fromarray(rgba)

    if edge_contract > 0:
        alpha_image = output.getchannel("A")
        for _ in range(edge_contract):
            alpha_image = alpha_image.filter(ImageFilter.MinFilter(3))
        output.putalpha(alpha_image)

    # The spec's residual rule is an acceptance gate. Any surviving strongly
    # magenta semi-opaque edge pixel is key contamination, never subject color.
    clean = np.asarray(output, dtype=np.uint8).copy()
    cr, cg, cb = (clean[..., index].astype(np.int16) for index in range(3))
    ca = clean[..., 3]
    residual = (ca > 0) & (cr > cg + 60) & (cb > cg + 60)
    clean[..., 3][residual] = 0
    return Image.fromarray(clean)


def main() -> None:
    args = parse_args()
    args.output.parent.mkdir(parents=True, exist_ok=True)
    with Image.open(args.input) as source:
        output = key_image(
            source,
            despill=args.despill,
            edge_contract=max(0, args.edge_contract),
        )
    output.save(args.output)


if __name__ == "__main__":
    main()
