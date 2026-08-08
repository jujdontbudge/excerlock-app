# ExcerLock App Branding Foundry Record

Standalone adoption note (2026-08-07): `icon.png` and `splash-logo.png` were
copied byte-for-byte into this app and revalidated successfully. Family E is
the STYLE-sanctioned deterministic composition exception: its subject is the
validated GPT Image 2 Family-B padlock glyph, while the square/transparent
canvas is composed by the required script rather than redrawn by another
model.

## Standalone byte-for-byte reuse ledger

The original compositions remain under `app/assets/`; the standalone app owns
the byte-identical destinations below. Each SHA-256 is identical for the named
source and destination.

| Asset | Original source | Standalone final | Matching source/destination SHA-256 |
|---|---|---|---|
| App icon | `app/assets/icon.png` | `excer-ui-mock/assets/icon.png` | `2d166444851f2a819bdab26b8b7751289cb67c26beccb7a8b31cb11965e9a177` |
| Splash logo | `app/assets/splash-logo.png` | `excer-ui-mock/assets/splash-logo.png` | `a17eaed209adb6812b7983c91ddeb8ec8dc15a20dd0d82eebd9c5c520ff4247e` |

Family **E — composed square** (`design/STYLE.md` §1). Added 2026-08-01 resolving
map ticket #64. **No image model was used**: both assets are deterministic
compositions of the already-shipped Family B glyph `icon-padlock-chip.png`, so
re-running the commands reproduces them byte-for-byte.

Decisions are Johan's, 2026-08-01: flat single-stop orange background, lock mark
on the same background for the splash, promote the method to a permanent
Family E. Subject choice was delegated ("just make some random shit i will clean
it up later") — the chip mark was taken over the full clay lock because the
clay lock's shading detail turns to mush at 60×60pt.

## icon.png — accepted

Original source: `app/assets/icon.png`. Standalone final:
`excer-ui-mock/assets/icon.png`. Subject:
`prototype/assets/icons/icon-padlock-chip.png`.

The command below is the original deterministic composition command; the
standalone final is its byte-for-byte reuse recorded above.

```bash
python3 prototype/scripts/compose_square.py \
  --subject prototype/assets/icons/icon-padlock-chip.png \
  --background '#F25A16' --size 1024 --subject-width 0.46 \
  --out app/assets/icon.png
python3 prototype/scripts/validate_square.py app/assets/icon.png \
  --size 1024 --background '#F25A16'
```

| Gate | Result |
|---|---|
| Size / mode | 1024×1024 · **RGB, no alpha channel** (Apple requirement) |
| Corners | all `(242, 90, 22)` = #F25A16 |
| Residual chroma | 0 |
| Subject bbox | `[276, 216, 747, 808]` |
| Subject span | 0.578 of the side (gate 0.28–0.72) |
| Safe inset | 0.211 (gate ≥0.08) |
| Center drift | 0.0005 (gate ≤0.03) |
| **Verdict** | **passed** |

Rejected variant: subject-width `0.52` — passed every gate but the mark crowded
the superellipse mask and read as heavy on a home screen. Not kept; regenerate
by changing the one flag if the judgement is ever revisited.

## splash-logo.png — accepted

Original source: `app/assets/splash-logo.png`. Standalone final:
`excer-ui-mock/assets/splash-logo.png`. Same subject and scale as the icon.

The command below is the original deterministic composition command; the
standalone final is its byte-for-byte reuse recorded above.

```bash
python3 prototype/scripts/compose_square.py \
  --subject prototype/assets/icons/icon-padlock-chip.png \
  --background none --size 1024 --subject-width 0.46 \
  --out app/assets/splash-logo.png
python3 prototype/scripts/validate_square.py app/assets/splash-logo.png \
  --size 1024 --expect-mode RGBA
```

| Gate | Result |
|---|---|
| Size / mode | 1024×1024 · **RGBA** (alpha kept on purpose) |
| Subject bbox | `[276, 216, 747, 808]` |
| Subject span | 0.578 of the side |
| Center drift | 0.0005 |
| **Verdict** | **passed** |

Alpha is retained here, unlike the icon: `expo-splash-screen` paints the
`backgroundColor` itself, so an opaque image would show as a hard-edged tile.

## Why the splash is a solid color and not the app's gradient

Johan chose "lock on gradient". SDK 57's `expo-splash-screen` plugin centers a
logo on a solid `backgroundColor`; a full-bleed gradient requires
`enableFullScreenImage_legacy`, which the Expo docs describe as a transition
helper that will be removed. Building launch branding on a deprecated flag was
not worth the gradient, so the splash uses the icon's flat #F25A16 and stays
visually continuous with the icon the user just tapped. Revisit if Expo ships a
supported full-bleed option.
