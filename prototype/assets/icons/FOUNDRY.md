# ExcerLock Dashboard Icon Foundry Record

Generated 2026-07-27 with Codex built-in `image_gen` (GPT Image 2). All generated
icons used the section 6 flat `#FF00FF` foundry workflow. Opaque model outputs are
kept beside the keyed finals as `*-opaque.png` or `*-source.png`. Final keyed
assets were produced with:

```bash
sips --resampleHeightWidth 1024 1024 <opaque.png> --out <1024.png>
python3 prototype/scripts/remove_chroma_key.py <1024.png> <final.png> --edge-contract 1 --despill
python3 prototype/scripts/validate_icons.py <final.png>
```

The dashboard renders every PNG through its measured non-transparent bounding
box, so foundry padding does not change the requested point size.

## Crop/edit assets

`gym-card-raw.png` was cropped from `design/mockups/nosparkle-v14-best.png` with
Pillow box `(48, 1331, 1131, 1820)`. `lock-reference.png` used box
`(340, 520, 840, 1130)`. Neither source under `design/` was modified.

### Gym cleanup attempt 1 — rejected

Output: `_rejected/gym-card-attempt-1.png`. Rejected because the three UI
elements were gone, but the model changed too much of the illustration's
composition.

```text
Use case: precise-object-edit. Image 1 is the strict edit target. Remove only the white “Go to gym” text, the thin-outlined circular i info icon, and the white rounded “Complete” button, filling those areas with seamlessly continued matching gym-illustration content (floor tiles, window light, equipment). Change nothing else — preserve the illustration’s exact style, colors, composition, framing, rounded crop corners, and original 1083×489 aspect ratio. No text, UI, logo, icon, button, or watermark anywhere.
```

Validation: removal passed; identity/composition comparison failed, so this
output does not ship.

### Gym cleanup targeted correction — accepted

Output: `gym-card-gpt2-source.png`; normalized final: `gym-card.png`.

```text
Use case: precise-object-edit. Image 1 is the strict edit target and must remain pixel-identical outside the three small removal regions. Remove only these three baked UI overlays: (1) the white “Go to gym” text at bottom-left, (2) the thin white circular i info icon at top-right, and (3) the white rounded “Complete” pill and black label at bottom-right. Inpaint only those exact covered pixels with seamlessly continued matching content from immediately around each region: dark floor tiles and nearby gym detail at bottom-left and bottom-right, and the same dark blue wall/window at top-right. Change absolutely nothing else. Preserve the original barbell, weights, benches, windows, lighting, palette, composition, geometry, crop, rounded corners, and 1083×489 aspect ratio exactly. No text, UI, icon, button, logo, or watermark anywhere.
```

Validation: `1083×489`, opaque RGB source, zero residual chroma pixels, no ghost
text/icon/button on close visual inspection, and clean in Chrome at the final
`361×163` display size.

## Family A prompts

### `lock-body.png`

Opaque output: `lock-body-opaque.png`; final alpha bounds:
`[102, 147, 922, 885]`.

```text
Use case: new-asset-with-style-reference
Asset type: 1024 × 1024 ExcerLock iOS hero illustration: LOCK BODY.
Input images: Image 1 is the strict identity and style reference; match its padlock body exactly. Use only the rounded body and its recessed keyhole identity; do not copy the orange backdrop or the shackle.
Primary request: Create one single centered padlock BODY alone from the reference — rounded-square ivory clay body with recessed light-gray keyhole, no shackle, top edge showing the two subtle shackle sockets. The subject must read instantly at 130 pt display size.
Scene/backdrop: perfectly flat, uniform solid magenta #FF00FF filling every background pixel to every corner, solely for chroma-key removal. No gradient, texture, shadow, glow, vignette, floor, reflection, particles, or lighting variation in the background.
Style/medium: soft matte 3D clay-like render; ivory white #F4F1F5 surfaces with soft neutral light-gray shading (#C9C4CC) and gentle rounded volume; recessed details are shaded soft light gray, never dark holes; no gloss, no metal, no hard shadows.
Color palette: ivory white #F4F1F5 and soft neutral light-gray #C9C4CC only in the subject. Do not use cyan, blue, teal, pink, gold, red, gray outside the listed light-gray, black, orange, or magenta in the subject.
Composition/framing: one centered subject with generous even padding; every subject pixel well separated from all four edges; strong readable silhouette at 130 pt.
Constraints: the subject must be opaque and confidently solid-filled, not hollow wire art and not merely thickened outlines. Crisp clean outer edge for chroma keying. The body is front-facing and symmetrical. No shackle. No outer halo, bloom, cast shadow, energy field, black box, text, UI, frame, face, character, logo, or watermark. One subject only.
```

### `lock-shackle.png`

Opaque output: `lock-shackle-opaque.png`; final alpha bounds:
`[146, 99, 878, 891]`.

```text
Use case: new-asset-with-style-reference
Asset type: 1024 × 1024 ExcerLock iOS hero illustration: LOCK SHACKLE.
Input images: Image 1 is the strict identity and style reference; match its shackle thickness, rounded shape, ivory material, and soft shading exactly. Use only the U-shaped shackle identity; do not copy the orange backdrop, body, or keyhole.
Primary request: Create one single centered padlock SHACKLE alone from the reference — one thick rounded ivory U-shaped shackle, upright, both legs at the bottom, front-facing, with a fully open center. The subject must read instantly at 110 pt display size.
Scene/backdrop: perfectly flat, uniform solid magenta #FF00FF filling every background pixel to every corner, solely for chroma-key removal. No gradient, texture, shadow, glow, vignette, floor, reflection, particles, or lighting variation in the background.
Style/medium: soft matte 3D clay-like render; ivory white #F4F1F5 surfaces with soft neutral light-gray shading (#C9C4CC) and gentle rounded volume; recessed details are shaded soft light gray, never dark holes; no gloss, no metal, no hard shadows.
Color palette: ivory white #F4F1F5 and soft neutral light-gray #C9C4CC only in the subject. Do not use cyan, blue, teal, pink, gold, red, gray outside the listed light-gray, black, orange, or magenta in the subject.
Composition/framing: one centered subject with generous even padding; every subject pixel well separated from all four edges; strong readable silhouette at 110 pt.
Constraints: the subject must be opaque and confidently solid-filled, not hollow wire art and not merely thickened outlines. Crisp clean outer edge for chroma keying. No body and no keyhole. No outer halo, bloom, cast shadow, energy field, black box, text, UI, frame, face, character, logo, or watermark. One subject only.
```

## Family B exact prompt templates

The full literal prompt below was executed once per row in the manifest. There
was no extra prompt text. Replace `⟨NAME⟩`, `⟨SUBJECT⟩`, and `⟨SIZE⟩` with the
verbatim values in the table.

### Template B1

Used for the first four glyphs.

```text
Use case: new-asset-with-style-reference
Asset type: 1024 × 1024 ExcerLock iOS icon: ⟨NAME⟩.
Primary request: Create one single centered ⟨SUBJECT⟩. The subject must read instantly at ⟨SIZE⟩ pt display size.
Scene/backdrop: perfectly flat, uniform solid magenta #FF00FF filling every background pixel to every corner, solely for chroma-key removal. No gradient, texture, shadow, glow, vignette, floor, reflection, particles, or lighting variation in the background.
Style/medium: flat 2D vector-like bitmap glyph; pure white #FFFFFF strokes and fills; rounded stroke ends and joins, generous stroke weight; simple friendly iOS-glyph geometry; zero gradients, zero glow, zero 3D, zero outline-only wire art — solid confident shapes.
Color palette: pure white #FFFFFF only in the subject. Do not use cyan, blue, teal, pink, gold, red, gray, black, or magenta in the subject unless listed above.
Composition/framing: one centered subject with generous even padding; every subject pixel well separated from all four edges; strong readable silhouette at ⟨SIZE⟩ pt.
Constraints: the subject must be opaque and confidently solid-filled, not hollow wire art and not merely thickened outlines. Crisp clean outer edge for chroma keying. No outer halo, bloom, cast shadow, energy field, black box, text, UI, frame, face, character, logo, or watermark. One subject only.
```

### Template B2

Used for the remaining seven glyphs. It differs from B1 only by explicitly
locking the subject to roughly 65% of the canvas.

```text
Use case: new-asset-with-style-reference
Asset type: 1024 × 1024 ExcerLock iOS icon: ⟨NAME⟩.
Primary request: Create one single centered ⟨SUBJECT⟩. The subject must read instantly at ⟨SIZE⟩ pt display size.
Scene/backdrop: perfectly flat, uniform solid magenta #FF00FF filling every background pixel to every corner, solely for chroma-key removal. No gradient, texture, shadow, glow, vignette, floor, reflection, particles, or lighting variation in the background.
Style/medium: flat 2D vector-like bitmap glyph; pure white #FFFFFF strokes and fills; rounded stroke ends and joins, generous stroke weight; simple friendly iOS-glyph geometry; zero gradients, zero glow, zero 3D, zero outline-only wire art — solid confident shapes.
Color palette: pure white #FFFFFF only in the subject. Do not use cyan, blue, teal, pink, gold, red, gray, black, or magenta in the subject unless listed above.
Composition/framing: one centered subject occupying roughly 65% of the canvas with generous even padding; every subject pixel well separated from all four edges; strong readable silhouette at ⟨SIZE⟩ pt.
Constraints: the subject must be opaque and confidently solid-filled, not hollow wire art and not merely thickened outlines. Crisp clean outer edge for chroma keying. No outer halo, bloom, cast shadow, energy field, black box, text, UI, frame, face, character, logo, or watermark. One subject only.
```

| Final asset | Template | `⟨NAME⟩` | `⟨SUBJECT⟩` | `⟨SIZE⟩` |
|---|---:|---|---|---:|
| `icon-padlock-mini.png` | B1 | `ICON PADLOCK MINI` | `tiny simple filled padlock, closed, with a rounded shackle and compact solid body` | 12 |
| `icon-padlock-chip.png` | B1 | `ICON PADLOCK CHIP` | `small simple filled padlock, closed, with a rounded shackle and sturdy solid body` | 18 |
| `icon-sparkle.png` | B1 | `ICON SPARKLE` | `one four-point star sparkle, points up/down/left/right, plump center and softly concave sides` | 18 |
| `icon-pencil.png` | B1 | `ICON PENCIL` | `diagonal solid pencil at 45°, tip lower-left, eraser upper-right` | 20 |
| `icon-arrow-right.png` | B2 | `ICON ARROW RIGHT` | `right-pointing arrow with a straight horizontal shaft and rounded chevron head` | 20 |
| `icon-info.png` | B2 | `ICON INFO` | `lowercase “i” inside one thin but confident circular outline` | 24 |
| `icon-tab-alarm.png` | B2 | `ICON TAB ALARM` | `classic round alarm clock with two top bells, two small feet, and simple hands` | 30 |
| `icon-tab-music.png` | B2 | `ICON TAB MUSIC` | `musical eighth-note with one small curved arc sweeping beside it` | 30 |
| `icon-tab-spiral.png` | B2 | `ICON TAB SPIRAL` | `round concentric spiral coil made from one generous rounded stroke, similar to a soft fingerprint swirl` | 30 |
| `icon-tab-mountain.png` | B2 | `ICON TAB MOUNTAIN` | `abstract twin-peak mountain forming a subtle capital letter A, two solid friendly shapes with a narrow valley` | 30 |
| `icon-tab-chart.png` | B2 | `ICON TAB CHART` | `rounded-square solid container containing three vertical bar-chart cutout bars of increasing varied heights` | 30 |

## Validation results

All keyed finals are `1024×1024 RGBA`, have four exact zero-alpha corners, and
have zero pixels matching the residual rule
`alpha > 0 AND R > G+60 AND B > G+60`. Chrome visual validation used
`prototype/acceptance/locked-web.png` and the actual final gradient/display
sizes; every asset passed with no magenta box or fringe.

| Asset | Corner alpha | Residual pixels | Visible pixels | Coverage | Alpha bounds | Chrome gradient |
|---|---|---:|---:|---:|---|---|
| `lock-body.png` | `0,0,0,0` | 0 | 583,782 | 0.556738 | `[102,147,922,885]` | Pass |
| `lock-shackle.png` | `0,0,0,0` | 0 | 269,882 | 0.257380 | `[146,99,878,891]` | Pass |
| `icon-padlock-mini.png` | `0,0,0,0` | 0 | 17,429 | 0.016622 | `[444,415,580,591]` | Pass |
| `icon-padlock-chip.png` | `0,0,0,0` | 0 | 82,495 | 0.078673 | `[362,324,662,701]` | Pass |
| `icon-sparkle.png` | `0,0,0,0` | 0 | 117,746 | 0.112291 | `[186,186,838,838]` | Pass |
| `icon-pencil.png` | `0,0,0,0` | 0 | 185,624 | 0.177025 | `[150,122,892,866]` | Pass |
| `icon-arrow-right.png` | `0,0,0,0` | 0 | 156,451 | 0.149203 | `[128,254,910,770]` | Pass |
| `icon-info.png` | `0,0,0,0` | 0 | 146,724 | 0.139927 | `[124,116,892,900]` | Pass |
| `icon-tab-alarm.png` | `0,0,0,0` | 0 | 213,468 | 0.203579 | `[193,144,831,867]` | Pass |
| `icon-tab-music.png` | `0,0,0,0` | 0 | 159,307 | 0.151927 | `[247,139,761,859]` | Pass |
| `icon-tab-spiral.png` | `0,0,0,0` | 0 | 263,479 | 0.251273 | `[148,152,876,842]` | Pass |
| `icon-tab-mountain.png` | `0,0,0,0` | 0 | 278,017 | 0.265138 | `[123,234,901,776]` | Pass |
| `icon-tab-chart.png` | `0,0,0,0` | 0 | 313,025 | 0.298524 | `[167,173,856,847]` | Pass |

