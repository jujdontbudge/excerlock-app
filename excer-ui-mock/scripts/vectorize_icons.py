#!/usr/bin/env python3
"""Vectorize ExcerLock runtime icon PNGs with VisionCortex VTracer.

The accepted PNGs remain the immutable foundry sources. This script writes
SVG runtime derivatives beside them so asset provenance stays obvious.
"""

from __future__ import annotations

import argparse
import hashlib
import re
import xml.etree.ElementTree as ET
from pathlib import Path

import vtracer


PROJECT_ROOT = Path(__file__).resolve().parents[1]
ICON_DIRECTORIES = (PROJECT_ROOT / "assets" / "glyphs", PROJECT_ROOT / "assets" / "heroes")
SVG_OPEN_RE = re.compile(r"<svg(?P<attributes>[^>]*)>")


def build_unified_lock_svg(traced_xml: str) -> str:
    """Keep the exact traced silhouette, then rebuild its volume cleanly.

    VTracer represents a smooth clay gradient as thousands of small color
    islands. Those islands read as dirt at phone size. A high speckle pass
    gives us the precise outer silhouette and keyhole; native SVG gradients
    then restore the intended broad highlights, socket creases, bends, and
    recessed keyhole without the chalky top/bottom artifacts.
    """
    root = ET.fromstring(traced_xml)
    paths = [node for node in root.findall("{http://www.w3.org/2000/svg}path") if node.get("d")]
    if not paths:
        raise ValueError("Unified lock trace contains no silhouette path")
    silhouette = paths[0]
    keyhole = next((node for node in paths if node.get("fill") == "#AB9C95"), None)
    if keyhole is None:
        raise ValueError("Unified lock trace contains no keyhole path")

    def path_attributes(node: ET.Element) -> str:
        return f'd="{node.get("d")}" transform="{node.get("transform")}"'

    silhouette_attrs = path_attributes(silhouette)
    keyhole_attrs = path_attributes(keyhole)
    return f'''<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1254" height="1254" viewBox="255 150 748 969">
  <defs>
    <radialGradient id="surface" cx="34%" cy="24%" r="88%">
      <stop offset="0" stop-color="#FFFFFF"/>
      <stop offset="0.48" stop-color="#FBF9F8"/>
      <stop offset="0.78" stop-color="#F3EFED"/>
      <stop offset="1" stop-color="#E5DEDA"/>
    </radialGradient>
    <linearGradient id="shackle" x1="22%" y1="12%" x2="78%" y2="92%">
      <stop offset="0" stop-color="#FFFFFF"/>
      <stop offset="0.48" stop-color="#F9F7F6"/>
      <stop offset="1" stop-color="#E8E4E2"/>
    </linearGradient>
    <radialGradient id="socket" cx="50%" cy="50%" r="50%">
      <stop offset="0" stop-color="#B8ADA8" stop-opacity="0.48"/>
      <stop offset="0.42" stop-color="#D7CECA" stop-opacity="0.28"/>
      <stop offset="1" stop-color="#FFFFFF" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="lowerShade" cx="50%" cy="50%" r="50%">
      <stop offset="0" stop-color="#CFC6C1" stop-opacity="0.35"/>
      <stop offset="1" stop-color="#FFFFFF" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="keyhole" x1="15%" y1="0%" x2="85%" y2="100%">
      <stop offset="0" stop-color="#C7C0BC"/>
      <stop offset="0.48" stop-color="#ABA39F"/>
      <stop offset="1" stop-color="#8F8783"/>
    </linearGradient>
    <clipPath id="lockClip"><path {silhouette_attrs}/></clipPath>
  </defs>
  <path {silhouette_attrs} fill="url(#surface)"/>
  <g clip-path="url(#lockClip)">
    <path d="M389 475 C389 350 392 313 418 264 C460 187 536 150 640 150 C778 150 876 230 907 346 C918 389 915 442 913 520 C912 557 908 578 887 586 C856 594 815 585 790 570 C775 560 775 542 777 500 L780 430 C780 338 725 297 642 297 C562 297 520 350 520 458 L520 477 C518 500 499 509 469 511 C430 513 390 504 389 475 Z" fill="url(#shackle)" opacity="0.34"/>
    <ellipse cx="450" cy="500" rx="58" ry="22" fill="url(#socket)" transform="rotate(-7 450 500)"/>
    <ellipse cx="842" cy="552" rx="60" ry="23" fill="url(#socket)" transform="rotate(9 842 552)"/>
    <ellipse cx="642" cy="1095" rx="355" ry="105" fill="url(#lowerShade)" opacity="0.72"/>
  </g>
  <path {keyhole_attrs} fill="url(#keyhole)" stroke="#D8D0CC" stroke-width="6" stroke-linejoin="round"/>
</svg>'''


def vectorize(source: Path) -> Path:
    destination = source.with_suffix(".svg")
    is_hero = source.parent.name == "heroes"
    is_unified_lock = source.stem == "lock-unified"

    # Glyphs are flat white artwork and stay extremely compact at full color
    # precision. Heroes need more gradient layers to retain their clay volume.
    # The unified Home lock is the deliberate exception: it is a large hero,
    # so preserve its subtle white-on-white shading with a much denser trace.
    vtracer.convert_image_to_svg_py(
        str(source),
        str(destination),
        colormode="color",
        hierarchical="stacked",
        mode="spline",
        filter_speckle=0 if is_unified_lock else 4 if not is_hero else 8,
        color_precision=8,
        layer_difference=2 if is_unified_lock else 12 if not is_hero else 16,
        corner_threshold=55 if is_unified_lock else 60,
        length_threshold=0.75 if is_unified_lock else 4.0 if not is_hero else 8.0,
        max_iterations=20 if is_unified_lock else 10,
        splice_threshold=35 if is_unified_lock else 45,
        path_precision=4 if is_unified_lock else 2,
    )

    xml = destination.read_text(encoding="utf-8")

    def add_view_box(match: re.Match[str]) -> str:
        attributes = match.group("attributes")
        width = re.search(r'\bwidth="([0-9.]+)"', attributes)
        height = re.search(r'\bheight="([0-9.]+)"', attributes)
        if not width or not height:
            raise ValueError(f"VTracer output lacks dimensions: {destination}")
        # The generated lock intentionally has generous foundry padding. Crop
        # only its SVG viewport to the validated visible-pixel bounds so the
        # hero reads larger without stretching or altering the source art.
        view_box = "255 150 748 969" if is_unified_lock else f"0 0 {width.group(1)} {height.group(1)}"
        return f'<svg{attributes} viewBox="{view_box}">'

    xml, replacements = SVG_OPEN_RE.subn(add_view_box, xml, count=1)
    if replacements != 1:
        raise ValueError(f"VTracer output lacks an SVG root: {destination}")

    destination.write_text(xml, encoding="utf-8")
    return destination


def selected_pngs() -> list[Path]:
    return sorted(
        path
        for directory in ICON_DIRECTORIES
        for path in directory.glob("*.png")
        if not path.stem.endswith("-opaque")
    )


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true", help="verify the expected SVG set without rewriting it")
    args = parser.parse_args()

    sources = selected_pngs()
    expected = {path.with_suffix(".svg") for path in sources}

    if args.check:
        actual = {
            path
            for directory in ICON_DIRECTORIES
            for path in directory.glob("*.svg")
        }
        if expected != actual:
            missing = sorted(str(path.relative_to(PROJECT_ROOT)) for path in expected - actual)
            extra = sorted(str(path.relative_to(PROJECT_ROOT)) for path in actual - expected)
            raise SystemExit(f"SVG inventory mismatch. Missing: {missing}. Extra: {extra}.")
        for path in sorted(actual):
            xml = path.read_text(encoding="utf-8")
            if "viewBox=" not in xml or "<path" not in xml:
                raise SystemExit(f"Invalid runtime SVG: {path.relative_to(PROJECT_ROOT)}")
            if path.stem == "lock-unified":
                if xml.count("<path") != 28_896:
                    raise SystemExit("Unified lock must retain the approved maximum-detail trace.")
        print(f"Verified {len(actual)} VTracer SVG icons.")
        return

    for source in sources:
        destination = vectorize(source)
        digest = hashlib.sha256(destination.read_bytes()).hexdigest()
        print(f"{destination.relative_to(PROJECT_ROOT)} {digest}")


if __name__ == "__main__":
    main()
