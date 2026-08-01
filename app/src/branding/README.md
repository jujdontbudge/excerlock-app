# branding

The app icon and splash screen — the two assets Apple requires before any build
installs on a device, simulator or TestFlight.

This module has no runtime code on purpose. Launch branding is entirely native
config plus two PNGs, so what it owns is the **contract**: the paths and the
background color live in `assets.ts`, and the guardrails in `__tests__` assert
that `app.json` and the shipped files still agree with it.

## What ships

| Asset | Path | Format | Source |
|---|---|---|---|
| App icon | `app/assets/icon.png` | 1024×1024, **RGB, no alpha** | Family E composition |
| Splash logo | `app/assets/splash-logo.png` | 1024×1024, RGBA | Family E composition |

Both are the shipped Family B glyph `icon-padlock-chip.png` centered at 46% of
the square. The icon bakes the flat orange behind it; the splash logo keeps its
alpha because `expo-splash-screen` paints the background itself.

## Regenerating

Deterministic — same inputs give byte-identical output, no image model involved:

```bash
python3 prototype/scripts/compose_square.py \
  --subject prototype/assets/icons/icon-padlock-chip.png \
  --background '#F25A16' --size 1024 --subject-width 0.46 \
  --out app/assets/icon.png
python3 prototype/scripts/validate_square.py app/assets/icon.png \
  --size 1024 --background '#F25A16'

python3 prototype/scripts/compose_square.py \
  --subject prototype/assets/icons/icon-padlock-chip.png \
  --background none --size 1024 --subject-width 0.46 \
  --out app/assets/splash-logo.png
python3 prototype/scripts/validate_square.py app/assets/splash-logo.png \
  --size 1024 --expect-mode RGBA
```

See `design/STYLE.md` §1 Family E for the rules these commands enforce.

## Two constraints that are easy to break

**The icon must have no alpha channel**, not merely be visually opaque — Apple
rejects the binary otherwise. `compose_square.py` drops the channel and the
guardrail reads the PNG's IHDR color type to prove it, because a config
assertion cannot see this.

**The splash background is a solid color, not the app's gradient.** SDK 57's
`expo-splash-screen` plugin centers a logo on a `backgroundColor`; a full-screen
gradient image needs `enableFullScreenImage_legacy`, which Expo documents as a
transition helper slated for removal. The solid `#F25A16` is the midpoint of the
palette's #F98529 → #EB2E02, so the splash still reads as continuous with the
icon that was tapped. Revisit only if Expo ships a supported full-bleed option.
