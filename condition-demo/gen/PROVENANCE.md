# Character frames — provenance (manifest law, design/STYLE.md §5)

| Item | Value |
|---|---|
| Generator | OpenAI Images API, model `gpt-image-2.5-sunburst` (the repo's configured Sunburst route: `app-store-screenshots/gen.py`, key from `~/.openai_key`) |
| Command | `IMG_QUALITY=medium python3 app-store-screenshots/gen.py generate condition-demo/gen/raw/character-sheet-v1.png condition-demo/gen/character-sheet-v1.txt 2048x2048` |
| Prompt | `gen/character-sheet-v1.txt` (verbatim, sent unmodified) |
| Reference images passed | none (style described in the prompt from `data/condition-demo-prototype-f1/references/*.png` and `app-store-screenshots/STYLE-R2.md`) |
| Usage / cost | input 482 text tokens, output 892 image tokens, $0.0292 |
| Raw output | `gen/raw/character-sheet-v1.png` (2048×2048, opaque magenta field; `gen/raw/` is ignored, regenerate with the command above) |
| Keying | `python3 prototype/scripts/remove_chroma_key.py <raw> gen/raw/character-sheet-v1-keyed.png --edge-contract 1 --despill` |
| Slicing | `python3 gen/slice_sheet.py gen/raw/character-sheet-v1-keyed.png assets/frames 640` — 8 cells found by alpha projection, feet bottom-aligned, head-centred, common canvas 435×648 |
| Fringe pass | residual magenta pixels (10–33 per frame) neutralised to green channel + half alpha; `validate_icons.py` residual = 0, corners alpha 0 on every frame |
| Frames | `assets/frames/walk-1..6.png` (walk cycle, side view facing right), `stand-phone.png` (still, looking at phone), `stand-ahead.png` (still, looking ahead, raised eyebrows) |
| Contact sheet | `gen/raw/frames-contact-sheet.png` (ignored, rebuilt by the slicing step) |
| Verdict | ACCEPTED v1 — consistent character across all 8 cells, flat vector, no outlines, phone in hand in every frame. Walk cycle order used in the prototype: 2 → 1 → 4 → 6 → 2 → 3 → 5 → 3 at 9 fps with opacity crossfade. |

## Reference material kept for the prototype

- `gen/references/restricted_view.png` — the stock iOS Screen Time shield (hourglass, "Restricted", one capsule button pinned low, home indicator). Layout anchor for the shield card.
- `gen/references/custom_shield_view.png` — a custom `ShieldConfiguration` shield (title, subtitle, primary capsule + secondary text button) showing where the two buttons sit.
- `gen/references/instagram_shielded.png` — how a shielded app icon looks on the Home Screen (dimmed + hourglass).
Source: https://pedroesli.com/2023-11-13-screen-time-api/ (downloaded 2026-09-19).

The shield rendered in the prototype uses the shipped ExcerLock configuration from
`app-next/targets/ShieldConfiguration/ShieldConfigurationExtension.swift`: `systemThickMaterialLight` blur, background `#FFF0E5` @ 0.96,
orange `#C94710` clay lock icon (`ClayLockIcon.swift` geometry), title `#1D1D22`, subtitle `#6E6871`, orange primary button with white label.

## v2 — hands-free variant (treadmill: phone propped on the console)

| Item | Value |
|---|---|
| Route | Sunburst **edit** endpoint (`gen.py edit`), edit target = `gen/raw/character-sheet-v1.png` |
| Command | `IMG_QUALITY=medium python3 app-store-screenshots/gen.py edit condition-demo/gen/raw/character-sheet-v2-handsfree.png condition-demo/gen/character-sheet-v2-handsfree-edit.txt condition-demo/gen/raw/character-sheet-v1.png --size 2048x2048` |
| Prompt | `gen/character-sheet-v2-handsfree-edit.txt` (verbatim) |
| Usage / cost | input 1521 image + 143 text tokens, output 892 image tokens, $0.0396 |
| Keying / slicing | same pipeline as v1 → `assets/frames-free/walk-1..6.png`, `stand-a.png`, `stand-b.png` (both arms relaxed) |
| Verdict | ACCEPTED — identical character and poses, phone removed, arms swing naturally. Used only by the treadmill variant of “Unlock while walking”. |

## v3 — helpless scrolling (loop story screen 1)

| Item | Value |
|---|---|
| Route | Sunburst **edit** endpoint, reference = `gen/raw/scroll-reference.png` (the shipped `stand-phone` + `stand-ahead` frames on flat magenta, 2048×1024) |
| Command | `IMG_QUALITY=medium python3 app-store-screenshots/gen.py edit condition-demo/gen/raw/character-scroll-v3.png condition-demo/gen/character-scroll-v3-edit.txt condition-demo/gen/raw/scroll-reference.png --size 2048x1024` |
| Prompt | `gen/character-scroll-v3-edit.txt` (verbatim) |
| Usage / cost | input 1458 image + 330 text tokens, output 295 image tokens, $0.0222 |
| Keying | `remove_chroma_key.py --edge-contract 1 --despill`; two cells cropped by alpha, scaled to 95% of the `stand-phone` figure height, feet on its baseline and left edge, on the common 435×648 canvas; fringe pass as v1 |
| Frames | `assets/condition-demo/frames/scroll-1.png`, `scroll-2.png` (hunched, droopy eyes, phone at the face; thumb high / low) |
| Verdict | PENDING captain approval |

## Trial-screen phone frame (`app-next/assets/phone-frame.png`)

Method requested by the captain: the scaffold-then-enhance approach of
[adamlyttleapps/claude-skill-aso-appstore-screenshots](https://github.com/adamlyttleapps/claude-skill-aso-appstore-screenshots)
(MIT): a deterministic flat device scaffold, then an image model renders it photo-real. Apple's official
product bezels were not used: their licence forbids embedding them in software.

| Item | Value |
|---|---|
| Scaffold | 1024×1536 flat magenta; 690×1440 dark rounded body at (167,48), radius 104; 20 px bezel; black 190×56 island; left action/volume and right power/camera-control bumps |
| Command | `IMG_QUALITY=medium python3 app-store-screenshots/gen.py edit condition-demo/gen/raw/phone-frame/frame-v1-opaque.png condition-demo/gen/phone-frame-edit.txt condition-demo/gen/raw/phone-frame/scaffold.png --size 1024x1536` |
| Prompt | `gen/phone-frame-edit.txt` (verbatim) |
| Usage / cost | input 1536 image + 61 text tokens, output 343 image tokens, $0.0229 |
| Keying | `remove_chroma_key.py --edge-contract 1 --despill` for the background. The model painted a wallpaper into the screen, so the screen is cut geometrically: rounded rect (192,71)–(832,1465), radius 112, keeping the island (419,88)–(607,145); leftover corner pixels painted bezel black. Cropped to 704×1450; hole (32,28) 640×1394, radius 112. Zero residual chroma, transparent corners |
| Use | `PlanTrialPreview` renders the user's real Home UI (402×874 canvas, scaled) inside the hole |
| Verdict | SUPERSEDED by v2 — the captain judged v1 “not like an actual iPhone” |

### v2 — iPhone 17 Pro, Silver (shipped)

| Item | Value |
|---|---|
| Scaffold | real iPhone 17 Pro proportions measured from Apple's bezel (numbers only; no Apple pixels copied or shipped): 690×1440 body, 18 px silver rim + black border ≈ 3.7% of width, 1206×2622-ratio display with corner radius 15.8% of its width, island 31% of display width, Action/volume/side/Camera Control buttons; the real Home screenshot composited on the display |
| Command | `IMG_QUALITY=high python3 app-store-screenshots/gen.py edit condition-demo/gen/raw/phone-frame/frame-v2-opaque.png condition-demo/gen/phone-frame-v2-edit.txt condition-demo/gen/raw/phone-frame/scaffold-v2.png --size 1024x1536` |
| Prompt | `gen/phone-frame-v2-edit.txt` (verbatim) |
| Usage / cost | input 1536 image + 112 text tokens, output 1372 image tokens, $0.0540 |
| Keying | chroma key as v1; display cut at (196,76)–(828,1459), radius 112 (chosen side-by-side against Apple's render), island (411,96)–(613,153) kept; crop 703×1442, hole (35,29) 632×1383 |
| Status bar | live: clock plus SF Symbols `cellularbars`, `wifi`, `battery.100percent` (expo-symbols, already linked natively) |
| Verdict | ACCEPTED pending captain review |
