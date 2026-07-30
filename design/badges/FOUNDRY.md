# Milestone badge foundry — Family A manifest (ticket #74)

Every generation for the 22-badge milestone shelf is logged here, accepted or
rejected. No entry means the asset does not ship. Produced with Codex built-in
`image_gen` (GPT Image 2) on 2026-07-30 per `design/STYLE.md` Family A and Johan's
decision on ticket #74.

## Production status

**3 of 22 complete and validated.**

- Streaks: **3 · 7 · 14** · 30 · 60 · 100 · 180 · 365 days
- Activities: 1 · 5 · 10 · 25 · 50 · 100 · 250 · 500
- Time Reclaimed: 10 · 25 · 50 · 100 · 250 · 500 hours

Bold thresholds are complete. Production proceeds left to right, one ladder at
a time.

## Common production settings

- **Family/template:** Family A, using the canonical `lock-body.png` /
  `lock-shackle.png` prompt structure from
  `prototype/assets/icons/FOUNDRY.md`. Only the asset, reference-role, subject,
  and display-size lines change. The Scene/Style/Palette blocks remain
  word-for-word; the canonical Constraints block remains word-for-word apart
  from subject-specific geometry and the explicit ban on threshold marks.
- **References on every generation:** `prototype/assets/icons/lock-body.png`
  and `prototype/assets/icons/lock-shackle.png`, passed as strict material and
  shading references.
- **Generation canvas:** 1024×1024, opaque, perfectly flat `#FF00FF`.
- **Final display target:** approximately 40 pt on the eight-item shelf rows.
- **Pipeline:**

  ```bash
  sips --resampleHeightWidth 1024 1024 <opaque.png> --out <1024.png>
  python3 prototype/scripts/remove_chroma_key.py <1024.png> <final.png> --edge-contract 1 --despill
  python3 prototype/scripts/validate_icons.py <final.png>
  ```

- **Opaque edit targets:** retained beside finals as `<name>-opaque.png`.
- **Visual QA:** each accepted final is inspected at 40 pt (120 px at 3×)
  against the production orange gradient `#F98529 → #EB2E02`.

## Locked-state decision

Locked art is **derived at render time from the accepted final's alpha mask**:
apply a neutral mid-gray tint (QA value `#7E7781`) while preserving the same
outer alpha. No separately generated locked files ship.

This choice is deliberate: the three ladders use coarse, distinct outer
silhouettes (flame, motion bolt, hourglass), so their identity survives without
interior shading at 40 pt. A runtime tint keeps locked and unlocked geometry
pixel-identical, avoids model drift between states, and avoids 22 redundant
generations. The locked silhouette is visually checked beside each unlocked
asset rather than assumed.

## Validation results

| Final asset | Mode / size | Corner alpha | Residual pixels | Visible pixels | Coverage | Alpha bounds | 40 pt gradient | Locked silhouette |
|---|---|---|---:|---:|---:|---|---|---|
| `streak-3-days.png` | RGBA / 1024×1024 | `0,0,0,0` | 0 | 310,154 | 0.295786 | `[199,144,824,882]` | Pass — clean edge, no fringe or box | Pass |
| `streak-7-days.png` | RGBA / 1024×1024 | `0,0,0,0` | 0 | 345,212 | 0.329220 | `[192,108,832,917]` | Pass — clean edge, no fringe or box | Pass |
| `streak-14-days.png` | RGBA / 1024×1024 | `0,0,0,0` | 0 | 397,347 | 0.378940 | `[174,68,851,954]` | Pass — clean edge, no fringe or box | Pass |

## Generation log

### Streak 3 days — accepted

- **Final path:** `design/badges/streak-3-days.png`
- **Opaque output:** `design/badges/streak-3-days-opaque.png`
- **Template used:** Family A canonical soft-clay hero template
- **Reference images passed:**
  `prototype/assets/icons/lock-body.png`,
  `prototype/assets/icons/lock-shackle.png`
- **Validation:** accepted; see the table row above.

**Verbatim prompt**

```text
Use case: new-asset-with-style-reference
Asset type: 1024 × 1024 ExcerLock iOS milestone badge: STREAK 3 DAYS.
Input images: Image 1 and Image 2 are strict material and shading references; match their ivory clay surface, soft neutral light-gray shading, gentle rounded volume, and matte finish exactly. Do not copy either padlock silhouette or keyhole.
Primary request: Create one single centered compact flame-shaped milestone badge — a plump upright three-lobed outer flame silhouette with one shallow recessed inner-flame detail shaded light gray, front-facing and symmetrical, with no pedestal or separate pieces. The subject must read instantly at 40 pt display size.
Scene/backdrop: perfectly flat, uniform solid magenta #FF00FF filling every background pixel to every corner, solely for chroma-key removal. No gradient, texture, shadow, glow, vignette, floor, reflection, particles, or lighting variation in the background.
Style/medium: soft matte 3D clay-like render; ivory white #F4F1F5 surfaces with soft neutral light-gray shading (#C9C4CC) and gentle rounded volume; recessed details are shaded soft light gray, never dark holes; no gloss, no metal, no hard shadows.
Color palette: ivory white #F4F1F5 and soft neutral light-gray #C9C4CC only in the subject. Do not use cyan, blue, teal, pink, gold, red, gray outside the listed light-gray, black, orange, or magenta in the subject.
Composition/framing: one centered subject with generous even padding; every subject pixel well separated from all four edges; strong readable silhouette at 40 pt.
Constraints: the subject must be opaque and confidently solid-filled, not hollow wire art and not merely thickened outlines. Crisp clean outer edge for chroma keying. The badge is front-facing and symmetrical. No numeral, number, day label, or threshold mark. No outer halo, bloom, cast shadow, energy field, black box, text, UI, frame, face, character, logo, or watermark. One subject only.
```

### Streak 14 days — accepted

- **Final path:** `design/badges/streak-14-days.png`
- **Opaque output:** `design/badges/streak-14-days-opaque.png`
- **Template used:** Family A canonical soft-clay hero template
- **Reference images passed:**
  `prototype/assets/icons/lock-body.png`,
  `prototype/assets/icons/lock-shackle.png`
- **Validation:** accepted; see the table row above.

**Verbatim prompt**

```text
Use case: new-asset-with-style-reference
Asset type: 1024 × 1024 ExcerLock iOS milestone badge: STREAK 14 DAYS.
Input images: Image 1 and Image 2 are strict material and shading references; match their ivory clay surface, soft neutral light-gray shading, gentle rounded volume, and matte finish exactly. Do not copy either padlock silhouette or keyhole.
Primary request: Create one single centered compact flame-shaped milestone badge — a broad upright flame silhouette with a tall center point, two rounded side tongues, and two simple nested shallow flame recesses shaded light gray, front-facing and symmetrical, with no pedestal or separate pieces. The subject must read instantly at 40 pt display size.
Scene/backdrop: perfectly flat, uniform solid magenta #FF00FF filling every background pixel to every corner, solely for chroma-key removal. No gradient, texture, shadow, glow, vignette, floor, reflection, particles, or lighting variation in the background.
Style/medium: soft matte 3D clay-like render; ivory white #F4F1F5 surfaces with soft neutral light-gray shading (#C9C4CC) and gentle rounded volume; recessed details are shaded soft light gray, never dark holes; no gloss, no metal, no hard shadows.
Color palette: ivory white #F4F1F5 and soft neutral light-gray #C9C4CC only in the subject. Do not use cyan, blue, teal, pink, gold, red, gray outside the listed light-gray, black, orange, or magenta in the subject.
Composition/framing: one centered subject with generous even padding; every subject pixel well separated from all four edges; strong readable silhouette at 40 pt.
Constraints: the subject must be opaque and confidently solid-filled, not hollow wire art and not merely thickened outlines. Crisp clean outer edge for chroma keying. The badge is front-facing and symmetrical. No numeral, number, day label, or threshold mark. No outer halo, bloom, cast shadow, energy field, black box, text, UI, frame, face, character, logo, or watermark. One subject only.
```

### Streak 7 days — accepted

- **Final path:** `design/badges/streak-7-days.png`
- **Opaque output:** `design/badges/streak-7-days-opaque.png`
- **Template used:** Family A canonical soft-clay hero template
- **Reference images passed:**
  `prototype/assets/icons/lock-body.png`,
  `prototype/assets/icons/lock-shackle.png`
- **Validation:** accepted; see the table row above.

**Verbatim prompt**

```text
Use case: new-asset-with-style-reference
Asset type: 1024 × 1024 ExcerLock iOS milestone badge: STREAK 7 DAYS.
Input images: Image 1 and Image 2 are strict material and shading references; match their ivory clay surface, soft neutral light-gray shading, gentle rounded volume, and matte finish exactly. Do not copy either padlock silhouette or keyhole.
Primary request: Create one single centered compact flame-shaped milestone badge — a plump upright five-lobed outer flame silhouette with one broad shallow recessed inner-flame detail shaded light gray, front-facing and symmetrical, with no pedestal or separate pieces. The subject must read instantly at 40 pt display size.
Scene/backdrop: perfectly flat, uniform solid magenta #FF00FF filling every background pixel to every corner, solely for chroma-key removal. No gradient, texture, shadow, glow, vignette, floor, reflection, particles, or lighting variation in the background.
Style/medium: soft matte 3D clay-like render; ivory white #F4F1F5 surfaces with soft neutral light-gray shading (#C9C4CC) and gentle rounded volume; recessed details are shaded soft light gray, never dark holes; no gloss, no metal, no hard shadows.
Color palette: ivory white #F4F1F5 and soft neutral light-gray #C9C4CC only in the subject. Do not use cyan, blue, teal, pink, gold, red, gray outside the listed light-gray, black, orange, or magenta in the subject.
Composition/framing: one centered subject with generous even padding; every subject pixel well separated from all four edges; strong readable silhouette at 40 pt.
Constraints: the subject must be opaque and confidently solid-filled, not hollow wire art and not merely thickened outlines. Crisp clean outer edge for chroma keying. The badge is front-facing and symmetrical. No numeral, number, day label, or threshold mark. No outer halo, bloom, cast shadow, energy field, black box, text, UI, frame, face, character, logo, or watermark. One subject only.
```
