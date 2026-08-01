#!/usr/bin/env python3
"""Family E (composed square) — composite a keyed Family A/B subject onto an
opaque background square. See design/STYLE.md section 1.

This is deterministic composition, not generation: the subject must already be a
shipped, validated cutout. Running it twice on the same inputs produces byte
-identical output, which is why the app icon is reproducible without an image
model.

    python3 prototype/scripts/compose_square.py \
        --subject prototype/assets/icons/icon-padlock-chip.png \
        --background '#F25A16' --size 1024 --subject-width 0.52 \
        --out app/assets/icon.png
"""

from __future__ import annotations

import argparse
from pathlib import Path

import numpy as np
from PIL import Image


def _hex_to_rgb(value: str) -> tuple[int, int, int]:
    cleaned = value.lstrip("#")
    if len(cleaned) != 6:
        raise ValueError(f"expected a 6-digit hex color, got {value!r}")
    return tuple(int(cleaned[i : i + 2], 16) for i in (0, 2, 4))  # type: ignore[return-value]


def trimmed_subject(path: Path) -> Image.Image:
    """Crop a keyed cutout to its own alpha bounding box.

    Foundry assets carry arbitrary transparent padding, so scaling the raw 1024
    canvas would make --subject-width mean something different for every asset.
    Trimming first makes the flag mean the subject's actual width.
    """
    with Image.open(path) as image:
        rgba = image.convert("RGBA")
        alpha = np.asarray(rgba)[..., 3]
        ys, xs = np.nonzero(alpha > 8)
        if len(xs) == 0:
            raise ValueError(f"{path} has no visible pixels")
        return rgba.crop((int(xs.min()), int(ys.min()), int(xs.max() + 1), int(ys.max() + 1)))


def vertical_gradient(size: int, top: str, bottom: str) -> Image.Image:
    top_rgb = np.array(_hex_to_rgb(top), dtype=np.float64)
    bottom_rgb = np.array(_hex_to_rgb(bottom), dtype=np.float64)
    ramp = np.linspace(0.0, 1.0, size)[:, None]
    rows = top_rgb[None, :] * (1 - ramp) + bottom_rgb[None, :] * ramp
    canvas = np.repeat(rows[:, None, :], size, axis=1)
    return Image.fromarray(np.rint(canvas).astype(np.uint8), mode="RGB")


def compose(
    subject_path: Path,
    size: int,
    subject_width: float,
    background: str,
    gradient_to: str | None,
) -> Image.Image:
    # `none` yields a transparent square — the splash logo needs the same trim
    # and centering as the icon, but expo-splash-screen paints the background
    # itself and would show a hard-edged tile if the image were opaque.
    if background == "none":
        canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    elif gradient_to:
        canvas = vertical_gradient(size, background, gradient_to)
    else:
        canvas = Image.new("RGB", (size, size), _hex_to_rgb(background))

    subject = trimmed_subject(subject_path)
    target_width = int(round(size * subject_width))
    scale = target_width / subject.width
    resized = subject.resize(
        (target_width, max(1, int(round(subject.height * scale)))),
        Image.LANCZOS,
    )

    offset = ((size - resized.width) // 2, (size - resized.height) // 2)
    canvas.paste(resized, offset, resized)
    return canvas


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--subject", type=Path, required=True)
    parser.add_argument("--out", type=Path, required=True)
    parser.add_argument("--size", type=int, default=1024)
    parser.add_argument(
        "--subject-width",
        type=float,
        default=0.52,
        help="subject width as a fraction of the square's side",
    )
    parser.add_argument("--background", required=True, help="hex fill, or gradient start")
    parser.add_argument(
        "--gradient-to",
        default=None,
        help="hex gradient end; omit for the flat single-stop fill",
    )
    args = parser.parse_args()

    result = compose(
        args.subject, args.size, args.subject_width, args.background, args.gradient_to
    )
    args.out.parent.mkdir(parents=True, exist_ok=True)
    # Opaque squares drop the alpha channel entirely — Apple rejects app icons
    # that carry one, even a fully-opaque one.
    final = result if args.background == "none" else result.convert("RGB")
    final.save(args.out, "PNG")
    print(f"{args.out} {final.size} {final.mode}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
