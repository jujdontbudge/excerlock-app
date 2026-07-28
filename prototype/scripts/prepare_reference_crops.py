#!/usr/bin/env python3
"""Create the exact reference crops prescribed by the dashboard build spec."""

from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / "design" / "mockups" / "nosparkle-v14-best.png"
ICON_DIR = ROOT / "prototype" / "assets" / "icons"


def main() -> None:
    ICON_DIR.mkdir(parents=True, exist_ok=True)
    with Image.open(SOURCE) as image:
        image.crop((48, 1331, 1131, 1820)).save(ICON_DIR / "gym-card-raw.png")
        image.crop((340, 520, 840, 1130)).save(ICON_DIR / "lock-reference.png")

    print(f"Wrote {ICON_DIR / 'gym-card-raw.png'} (1083x489)")
    print(f"Wrote {ICON_DIR / 'lock-reference.png'} (500x610)")


if __name__ == "__main__":
    main()
