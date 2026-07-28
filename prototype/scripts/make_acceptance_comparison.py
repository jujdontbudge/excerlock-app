#!/usr/bin/env python3
"""Build the final same-size mockup-vs-Chrome acceptance contact sheet."""

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[2]
PROTOTYPE = ROOT / "prototype"
REFERENCE_PATH = ROOT / "design" / "mockups" / "nosparkle-v14-best.png"
LOCKED_PATH = PROTOTYPE / "acceptance" / "locked-web.png"
OUTPUT_DIR = PROTOTYPE / "acceptance"

WIDTH = 393
HEIGHT = 852
FOOTER_TOP = 812


def lerp(a: int, b: int, amount: float) -> int:
    return round(a + (b - a) * amount)


def make_reference() -> Image.Image:
    source = Image.open(REFERENCE_PATH).convert("RGB").resize((393, 892), Image.Resampling.LANCZOS)
    reference = source.crop((0, 0, WIDTH, HEIGHT))

    # Remove the source site's dark footer. Continue the specified final
    # gradient stop, while retaining the active tab pixels that overlapped the
    # watermark boundary in the source capture.
    draw = ImageDraw.Draw(reference)
    start = (237, 50, 3)
    end = (235, 46, 2)
    for y in range(FOOTER_TOP, HEIGHT):
        t = (y - FOOTER_TOP) / max(1, HEIGHT - FOOTER_TOP - 1)
        draw.line((0, y, WIDTH, y), fill=tuple(lerp(a, b, t) for a, b in zip(start, end)))

    original = source.crop((0, 0, WIDTH, HEIGHT))
    active_mask = Image.new("L", (WIDTH, HEIGHT), 0)
    ImageDraw.Draw(active_mask).ellipse((164, 770, 229, 835), fill=255)
    reference.paste(original, (0, 0), active_mask)

    # Preserve the lower antialiased pixels of passive white tab glyphs.
    pixels = original.load()
    white_mask = Image.new("L", (WIDTH, HEIGHT), 0)
    white_pixels = white_mask.load()
    for y in range(FOOTER_TOP, 824):
        for x in range(WIDTH):
            r, g, b = pixels[x, y]
            if min(r, g, b) > 175 and max(r, g, b) - min(r, g, b) < 35:
                white_pixels[x, y] = min(255, max(0, (min(r, g, b) - 175) * 3))
    reference.paste(original, (0, 0), white_mask)

    ImageDraw.Draw(reference).rounded_rectangle((129, 838, 264, 844), radius=3, fill=(255, 255, 255))

    # The web prototype intentionally presents the screen with phone-like
    # continuous corners on the #111 page.
    rounded_mask = Image.new("L", (WIDTH, HEIGHT), 0)
    ImageDraw.Draw(rounded_mask).rounded_rectangle((0, 0, WIDTH - 1, HEIGHT - 1), radius=44, fill=255)
    framed = Image.new("RGB", (WIDTH, HEIGHT), (17, 17, 17))
    framed.paste(reference, (0, 0), rounded_mask)
    return framed


def main() -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    reference = make_reference()
    locked = Image.open(LOCKED_PATH).convert("RGB")
    if locked.size != (WIDTH, HEIGHT):
        raise ValueError(f"Expected 393x852 Chrome frame, got {locked.size}")

    reference.save(OUTPUT_DIR / "mockup-footer-removed.png")

    margin = 24
    header = 54
    gutter = 24
    canvas = Image.new("RGB", (margin * 2 + WIDTH * 2 + gutter, header + HEIGHT + margin), (17, 17, 17))
    canvas.paste(reference, (margin, header))
    canvas.paste(locked, (margin + WIDTH + gutter, header))
    draw = ImageDraw.Draw(canvas)
    font = ImageFont.load_default(size=16)
    draw.text((margin, 18), "Reference - footer artifact removed", fill=(245, 245, 245), font=font)
    draw.text((margin + WIDTH + gutter, 18), "Expo Web - Chrome 393x852", fill=(245, 245, 245), font=font)
    canvas.save(OUTPUT_DIR / "side-by-side.png")
    print(f"Wrote {OUTPUT_DIR / 'mockup-footer-removed.png'}")
    print(f"Wrote {OUTPUT_DIR / 'side-by-side.png'}")


if __name__ == "__main__":
    main()
