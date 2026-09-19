#!/usr/bin/env python3
"""Slice the keyed 2x4 character sheet into aligned, bottom-anchored frame PNGs.
Usage: slice_sheet.py <keyed.png> <out_dir> [target_height]
Frames are named in reading order: walk-1..walk-6, stand-phone, stand-ahead.
Each output shares one canvas size, feet on the same baseline, head-centred horizontally."""
import sys
from pathlib import Path
import numpy as np
from PIL import Image

src, out = Path(sys.argv[1]), Path(sys.argv[2])
target_h = int(sys.argv[3]) if len(sys.argv) > 3 else 640
out.mkdir(parents=True, exist_ok=True)
img = Image.open(src).convert("RGBA")
a = np.asarray(img)[..., 3] > 8

def bands(mask_1d, min_gap=20):
    on = np.where(mask_1d)[0]
    if len(on) == 0:
        return []
    groups, start, prev = [], on[0], on[0]
    for i in on[1:]:
        if i - prev > min_gap:
            groups.append((start, prev)); start = i
        prev = i
    groups.append((start, prev))
    return groups

rows = bands(a.any(axis=1))
cells = []
for (r0, r1) in rows:
    cols = bands(a[r0:r1 + 1].any(axis=0))
    for (c0, c1) in cols:
        sub = a[r0:r1 + 1, c0:c1 + 1]
        ys, xs = np.where(sub)
        cells.append((r0 + ys.min(), r0 + ys.max(), c0 + xs.min(), c0 + xs.max()))
names = ["walk-1", "walk-2", "walk-3", "walk-4", "walk-5", "walk-6", "stand-phone", "stand-ahead"]
assert len(cells) == 8, f"expected 8 cells, found {len(cells)}: {cells}"

# Head centre per cell: alpha centroid of the top 30% of the figure (stable across strides).
frames = []
for (y0, y1, x0, x1) in cells:
    crop = img.crop((x0, y0, x1 + 1, y1 + 1))
    al = np.asarray(crop)[..., 3] > 8
    h = al.shape[0]
    head = al[: max(1, int(h * 0.3))]
    xs = np.where(head)[1]
    frames.append((crop, float(xs.mean()) if len(xs) else crop.width / 2))

max_h = max(f.height for f, _ in frames)
scale = target_h / max_h
canvas_w = int(max(max(f.width * scale, 2 * abs(f.width * scale - hc * scale) + 2) for f, hc in frames)) + 40
canvas_w = int(max(f.width for f, _ in frames) * scale) + 120
canvas_h = target_h + 8
report = []
for name, (f, hc) in zip(names, frames):
    w, h = int(round(f.width * scale)), int(round(f.height * scale))
    fr = f.resize((w, h), Image.LANCZOS)
    canvas = Image.new("RGBA", (canvas_w, canvas_h), (0, 0, 0, 0))
    x = int(round(canvas_w / 2 - hc * scale))
    y = canvas_h - h - 4
    canvas.alpha_composite(fr, (x, y))
    canvas.save(out / f"{name}.png", optimize=True)
    report.append(f"{name}: src {f.width}x{f.height} -> {w}x{h} at x={x} y={y}")
print(f"canvas {canvas_w}x{canvas_h}, scale {scale:.3f}")
print("\n".join(report))
