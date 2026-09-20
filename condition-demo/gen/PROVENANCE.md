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
