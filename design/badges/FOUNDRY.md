# Milestone badge foundry — Family A manifest (ticket #74)

Every generation for the 22-badge milestone shelf is logged here, accepted or
rejected. No entry means the asset does not ship. Produced with Codex built-in
`image_gen` (GPT Image 2) on 2026-07-30 per `design/STYLE.md` Family A and Johan's
decision on ticket #74.

## Production status

**16 of 22 complete and validated.**

- Streaks: **3 · 7 · 14 · 30 · 60 · 100 · 180 · 365 days**
- Activities: **1 · 5 · 10 · 25 · 50 · 100 · 250 · 500**
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
| `streak-30-days.png` | RGBA / 1024×1024 | `0,0,0,0` | 0 | 376,275 | 0.358844 | `[143,128,880,953]` | Pass — clean edge, no fringe or box | Pass |
| `streak-60-days.png` | RGBA / 1024×1024 | `0,0,0,0` | 0 | 393,077 | 0.374867 | `[117,148,916,949]` | Pass — clean edge, no fringe or box | Pass |
| `streak-100-days.png` | RGBA / 1024×1024 | `0,0,0,0` | 0 | 371,417 | 0.354211 | `[130,84,893,949]` | Pass — clean edge, no fringe or box | Pass |
| `streak-180-days.png` | RGBA / 1024×1024 | `0,0,0,0` | 0 | 385,293 | 0.367444 | `[143,136,883,905]` | Pass — clean edge, no fringe or box | Pass |
| `streak-365-days.png` | RGBA / 1024×1024 | `0,0,0,0` | 0 | 399,693 | 0.381177 | `[88,128,933,894]` | Pass — clean edge, no fringe or box | Pass |
| `activity-1.png` | RGBA / 1024×1024 | `0,0,0,0` | 0 | 259,227 | 0.247218 | `[211,104,812,923]` | Pass — clean edge, no fringe or box | Pass |
| `activity-5.png` | RGBA / 1024×1024 | `0,0,0,0` | 0 | 275,765 | 0.262990 | `[186,100,846,919]` | Pass — clean edge, no fringe or box | Pass |
| `activity-10.png` | RGBA / 1024×1024 | `0,0,0,0` | 0 | 272,572 | 0.259945 | `[179,107,844,918]` | Pass — clean edge, no fringe or box | Pass |
| `activity-25.png` | RGBA / 1024×1024 | `0,0,0,0` | 0 | 250,059 | 0.238475 | `[178,140,845,874]` | Pass — clean edge, no fringe or box | Pass |
| `activity-50.png` | RGBA / 1024×1024 | `0,0,0,0` | 0 | 296,980 | 0.283222 | `[87,168,939,856]` | Pass — clean edge, no fringe or box | Pass |
| `activity-100.png` | RGBA / 1024×1024 | `0,0,0,0` | 0 | 347,953 | 0.331834 | `[98,164,927,846]` | Pass — clean edge, no fringe or box | Pass |
| `activity-250.png` | RGBA / 1024×1024 | `0,0,0,0` | 0 | 291,082 | 0.277597 | `[96,150,928,890]` | Pass — clean edge, no fringe or box | Pass |
| `activity-500.png` | RGBA / 1024×1024 | `0,0,0,0` | 0 | 297,298 | 0.283525 | `[119,138,906,876]` | Pass — clean edge, no fringe or box | Pass |

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

### 1 Activity — accepted

- **Final path:** `design/badges/activity-1.png`
- **Opaque output:** `design/badges/activity-1-opaque.png`
- **Template used:** Family A canonical soft-clay hero template
- **Reference images passed:**
  `prototype/assets/icons/lock-body.png`,
  `prototype/assets/icons/lock-shackle.png`
- **Validation:** accepted; see the table row above.

**Verbatim prompt**

```text
Use case: new-asset-with-style-reference
Asset type: 1024 × 1024 ExcerLock iOS milestone badge: 1 ACTIVITY.
Input images: Image 1 and Image 2 are strict material and shading references; match their ivory clay surface, soft neutral light-gray shading, gentle rounded volume, and matte finish exactly. Do not copy either padlock silhouette or keyhole.
Primary request: Create one single centered compact lightning-bolt-shaped milestone badge — one thick confident zigzag bolt leaning from upper-right to lower-left with broad rounded corners and one shallow recessed inner-bolt detail shaded light gray, all joined as one solid front-facing piece with no pedestal or separate pieces. The subject must read instantly at 40 pt display size.
Scene/backdrop: perfectly flat, uniform solid magenta #FF00FF filling every background pixel to every corner, solely for chroma-key removal. No gradient, texture, shadow, glow, vignette, floor, reflection, particles, or lighting variation in the background.
Style/medium: soft matte 3D clay-like render; ivory white #F4F1F5 surfaces with soft neutral light-gray shading (#C9C4CC) and gentle rounded volume; recessed details are shaded soft light gray, never dark holes; no gloss, no metal, no hard shadows.
Color palette: ivory white #F4F1F5 and soft neutral light-gray #C9C4CC only in the subject. Do not use cyan, blue, teal, pink, gold, red, gray outside the listed light-gray, black, orange, or magenta in the subject.
Composition/framing: one centered subject with generous even padding; every subject pixel well separated from all four edges; strong readable silhouette at 40 pt.
Constraints: the subject must be opaque and confidently solid-filled, not hollow wire art and not merely thickened outlines. Crisp clean outer edge for chroma keying. The badge is front-facing with a balanced diagonal silhouette. No numeral, number, count label, or threshold mark. No outer halo, bloom, cast shadow, energy field, black box, text, UI, frame, face, character, logo, or watermark. One subject only.
```

### 5 Activities — accepted

- **Final path:** `design/badges/activity-5.png`
- **Opaque output:** `design/badges/activity-5-opaque.png`
- **Template used:** Family A canonical soft-clay hero template
- **Reference images passed:**
  `prototype/assets/icons/lock-body.png`,
  `prototype/assets/icons/lock-shackle.png`
- **Validation:** accepted; see the table row above.
- **Review note:** direct comparison with `activity-1.png` confirmed that the
  original output adds exactly one small fin on each side beyond the bolt's two
  inherent zigzag corners. It is symmetric and advances the silhouette at
  40 pt.

**Verbatim prompt**

```text
Use case: new-asset-with-style-reference
Asset type: 1024 × 1024 ExcerLock iOS milestone badge: 5 ACTIVITIES.
Input images: Image 1 and Image 2 are strict material and shading references; match their ivory clay surface, soft neutral light-gray shading, gentle rounded volume, and matte finish exactly. Do not copy either padlock silhouette or keyhole.
Primary request: Create one single centered compact lightning-bolt milestone badge — one thick upright zigzag bolt with broad rounded corners and one short swept speed fin integrated into each side, plus one shallow recessed inner-bolt detail shaded light gray, all joined as one solid front-facing balanced silhouette with no pedestal or separate pieces. The subject must read instantly at 40 pt display size.
Scene/backdrop: perfectly flat, uniform solid magenta #FF00FF filling every background pixel to every corner, solely for chroma-key removal. No gradient, texture, shadow, glow, vignette, floor, reflection, particles, or lighting variation in the background.
Style/medium: soft matte 3D clay-like render; ivory white #F4F1F5 surfaces with soft neutral light-gray shading (#C9C4CC) and gentle rounded volume; recessed details are shaded soft light gray, never dark holes; no gloss, no metal, no hard shadows.
Color palette: ivory white #F4F1F5 and soft neutral light-gray #C9C4CC only in the subject. Do not use cyan, blue, teal, pink, gold, red, gray outside the listed light-gray, black, orange, or magenta in the subject.
Composition/framing: one centered subject with generous even padding; every subject pixel well separated from all four edges; strong readable silhouette at 40 pt.
Constraints: the subject must be opaque and confidently solid-filled, not hollow wire art and not merely thickened outlines. Crisp clean outer edge for chroma keying. The badge is front-facing with a balanced energetic silhouette. No numeral, number, count label, or threshold mark. No outer halo, bloom, cast shadow, energy field, black box, text, UI, frame, face, character, logo, or watermark. One subject only.
```

### 50 Activities — accepted

- **Final path:** `design/badges/activity-50.png`
- **Opaque output:** `design/badges/activity-50-opaque.png`
- **Template used:** Family A canonical soft-clay hero template
- **Reference images passed:**
  `prototype/assets/icons/lock-body.png`,
  `prototype/assets/icons/lock-shackle.png`
- **Validation:** accepted; see the table row above.

**Verbatim prompt**

```text
Use case: new-asset-with-style-reference
Asset type: 1024 × 1024 ExcerLock iOS milestone badge: 50 ACTIVITIES.
Input images: Image 1 and Image 2 are strict material and shading references; match their ivory clay surface, soft neutral light-gray shading, gentle rounded volume, and matte finish exactly. Do not copy either padlock silhouette or keyhole.
Primary request: Create one single centered compact winged-lightning milestone badge — one thick upright rounded zigzag bolt with one short solid wing integrated into each side, each wing formed by three broad stepped feather-like lobes, plus one shallow recessed inner-bolt detail shaded light gray, all joined as one solid front-facing symmetrical crest with no pedestal or separate pieces. The subject must read instantly at 40 pt display size.
Scene/backdrop: perfectly flat, uniform solid magenta #FF00FF filling every background pixel to every corner, solely for chroma-key removal. No gradient, texture, shadow, glow, vignette, floor, reflection, particles, or lighting variation in the background.
Style/medium: soft matte 3D clay-like render; ivory white #F4F1F5 surfaces with soft neutral light-gray shading (#C9C4CC) and gentle rounded volume; recessed details are shaded soft light gray, never dark holes; no gloss, no metal, no hard shadows.
Color palette: ivory white #F4F1F5 and soft neutral light-gray #C9C4CC only in the subject. Do not use cyan, blue, teal, pink, gold, red, gray outside the listed light-gray, black, orange, or magenta in the subject.
Composition/framing: one centered subject with generous even padding; every subject pixel well separated from all four edges; strong readable silhouette at 40 pt.
Constraints: the subject must be opaque and confidently solid-filled, not hollow wire art and not merely thickened outlines. Crisp clean outer edge for chroma keying. The badge is front-facing and symmetrical. No numeral, number, count label, or threshold mark. No outer halo, bloom, cast shadow, energy field, black box, text, UI, frame, face, character, logo, or watermark. One subject only.
```

### 500 Activities — accepted

- **Final path:** `design/badges/activity-500.png`
- **Opaque output:** `design/badges/activity-500-opaque.png`
- **Template used:** Family A canonical soft-clay hero template
- **Reference images passed:**
  `prototype/assets/icons/lock-body.png`,
  `prototype/assets/icons/lock-shackle.png`
- **Validation:** accepted; see the table row above.

**Verbatim prompt**

```text
Use case: new-asset-with-style-reference
Asset type: 1024 × 1024 ExcerLock iOS milestone badge: 500 ACTIVITIES.
Input images: Image 1 and Image 2 are strict material and shading references; match their ivory clay surface, soft neutral light-gray shading, gentle rounded volume, and matte finish exactly. Do not copy either padlock silhouette or keyhole.
Primary request: Create one single centered compact pinnacle winged-lightning crown badge — three bold rounded upper lightning prongs across the top with the center prong slightly tallest, all merging into one strong lower bolt point, flanked by broad upswept solid wings with five large stepped lobes each, plus one shallow recessed triple-bolt detail shaded light gray, all joined as one solid front-facing symmetrical silhouette with no pedestal or separate pieces. The subject must read instantly at 40 pt display size.
Scene/backdrop: perfectly flat, uniform solid magenta #FF00FF filling every background pixel to every corner, solely for chroma-key removal. No gradient, texture, shadow, glow, vignette, floor, reflection, particles, or lighting variation in the background.
Style/medium: soft matte 3D clay-like render; ivory white #F4F1F5 surfaces with soft neutral light-gray shading (#C9C4CC) and gentle rounded volume; recessed details are shaded soft light gray, never dark holes; no gloss, no metal, no hard shadows.
Color palette: ivory white #F4F1F5 and soft neutral light-gray #C9C4CC only in the subject. Do not use cyan, blue, teal, pink, gold, red, gray outside the listed light-gray, black, orange, or magenta in the subject.
Composition/framing: one centered subject with generous even padding; every subject pixel well separated from all four edges; strong readable silhouette at 40 pt.
Constraints: the subject must be opaque and confidently solid-filled, not hollow wire art and not merely thickened outlines. Crisp clean outer edge for chroma keying. The badge is front-facing and symmetrical. No numeral, number, count label, or threshold mark. No outer halo, bloom, cast shadow, energy field, black box, text, UI, frame, face, character, logo, or watermark. One subject only.
```

### 250 Activities — accepted

- **Final path:** `design/badges/activity-250.png`
- **Opaque output:** `design/badges/activity-250-opaque.png`
- **Template used:** Family A canonical soft-clay hero template
- **Reference images passed:**
  `prototype/assets/icons/lock-body.png`,
  `prototype/assets/icons/lock-shackle.png`
- **Validation:** accepted; see the table row above.

**Verbatim prompt**

```text
Use case: new-asset-with-style-reference
Asset type: 1024 × 1024 ExcerLock iOS milestone badge: 250 ACTIVITIES.
Input images: Image 1 and Image 2 are strict material and shading references; match their ivory clay surface, soft neutral light-gray shading, gentle rounded volume, and matte finish exactly. Do not copy either padlock silhouette or keyhole.
Primary request: Create one single centered compact elite winged-lightning crest badge — a bold double-tipped central bolt with two equal rounded upper lightning prongs separated by one clean notch and merging into one strong lower bolt point, flanked by broad upswept solid wings with five stepped lobes each, plus one shallow recessed double-bolt detail shaded light gray, all joined as one solid front-facing symmetrical silhouette with no pedestal or separate pieces. The subject must read instantly at 40 pt display size.
Scene/backdrop: perfectly flat, uniform solid magenta #FF00FF filling every background pixel to every corner, solely for chroma-key removal. No gradient, texture, shadow, glow, vignette, floor, reflection, particles, or lighting variation in the background.
Style/medium: soft matte 3D clay-like render; ivory white #F4F1F5 surfaces with soft neutral light-gray shading (#C9C4CC) and gentle rounded volume; recessed details are shaded soft light gray, never dark holes; no gloss, no metal, no hard shadows.
Color palette: ivory white #F4F1F5 and soft neutral light-gray #C9C4CC only in the subject. Do not use cyan, blue, teal, pink, gold, red, gray outside the listed light-gray, black, orange, or magenta in the subject.
Composition/framing: one centered subject with generous even padding; every subject pixel well separated from all four edges; strong readable silhouette at 40 pt.
Constraints: the subject must be opaque and confidently solid-filled, not hollow wire art and not merely thickened outlines. Crisp clean outer edge for chroma keying. The badge is front-facing and symmetrical. No numeral, number, count label, or threshold mark. No outer halo, bloom, cast shadow, energy field, black box, text, UI, frame, face, character, logo, or watermark. One subject only.
```

### 100 Activities — accepted

- **Final path:** `design/badges/activity-100.png`
- **Opaque output:** `design/badges/activity-100-opaque.png`
- **Template used:** Family A canonical soft-clay hero template
- **Reference images passed:**
  `prototype/assets/icons/lock-body.png`,
  `prototype/assets/icons/lock-shackle.png`
- **Validation:** accepted; see the table row above.

**Verbatim prompt**

```text
Use case: new-asset-with-style-reference
Asset type: 1024 × 1024 ExcerLock iOS milestone badge: 100 ACTIVITIES.
Input images: Image 1 and Image 2 are strict material and shading references; match their ivory clay surface, soft neutral light-gray shading, gentle rounded volume, and matte finish exactly. Do not copy either padlock silhouette or keyhole.
Primary request: Create one single centered compact high-rank winged-lightning crest badge — one thick upright rounded zigzag bolt with one broad upswept solid wing integrated into each side, each wing formed by four large stepped feather-like lobes, plus one shallow recessed inner-bolt detail shaded light gray, all joined as one solid front-facing symmetrical silhouette with no pedestal or separate pieces. The subject must read instantly at 40 pt display size.
Scene/backdrop: perfectly flat, uniform solid magenta #FF00FF filling every background pixel to every corner, solely for chroma-key removal. No gradient, texture, shadow, glow, vignette, floor, reflection, particles, or lighting variation in the background.
Style/medium: soft matte 3D clay-like render; ivory white #F4F1F5 surfaces with soft neutral light-gray shading (#C9C4CC) and gentle rounded volume; recessed details are shaded soft light gray, never dark holes; no gloss, no metal, no hard shadows.
Color palette: ivory white #F4F1F5 and soft neutral light-gray #C9C4CC only in the subject. Do not use cyan, blue, teal, pink, gold, red, gray outside the listed light-gray, black, orange, or magenta in the subject.
Composition/framing: one centered subject with generous even padding; every subject pixel well separated from all four edges; strong readable silhouette at 40 pt.
Constraints: the subject must be opaque and confidently solid-filled, not hollow wire art and not merely thickened outlines. Crisp clean outer edge for chroma keying. The badge is front-facing and symmetrical. No numeral, number, count label, or threshold mark. No outer halo, bloom, cast shadow, energy field, black box, text, UI, frame, face, character, logo, or watermark. One subject only.
```

### 25 Activities — accepted

- **Final path:** `design/badges/activity-25.png`
- **Opaque output:** `design/badges/activity-25-opaque.png`
- **Template used:** Family A canonical soft-clay hero template
- **Reference images passed:**
  `prototype/assets/icons/lock-body.png`,
  `prototype/assets/icons/lock-shackle.png`
- **Validation:** accepted; see the table row above.

**Verbatim prompt**

```text
Use case: new-asset-with-style-reference
Asset type: 1024 × 1024 ExcerLock iOS milestone badge: 25 ACTIVITIES.
Input images: Image 1 and Image 2 are strict material and shading references; match their ivory clay surface, soft neutral light-gray shading, gentle rounded volume, and matte finish exactly. Do not copy either padlock silhouette or keyhole.
Primary request: Create one single centered compact lightning-bolt milestone badge — one thick upright zigzag bolt with broad rounded corners and three short parallel swept speed fins integrated into each outer side beyond the bolt's inherent zigzag corners, plus one shallow recessed inner-bolt detail shaded light gray, all joined as one solid front-facing balanced silhouette with no pedestal or separate pieces. The subject must read instantly at 40 pt display size.
Scene/backdrop: perfectly flat, uniform solid magenta #FF00FF filling every background pixel to every corner, solely for chroma-key removal. No gradient, texture, shadow, glow, vignette, floor, reflection, particles, or lighting variation in the background.
Style/medium: soft matte 3D clay-like render; ivory white #F4F1F5 surfaces with soft neutral light-gray shading (#C9C4CC) and gentle rounded volume; recessed details are shaded soft light gray, never dark holes; no gloss, no metal, no hard shadows.
Color palette: ivory white #F4F1F5 and soft neutral light-gray #C9C4CC only in the subject. Do not use cyan, blue, teal, pink, gold, red, gray outside the listed light-gray, black, orange, or magenta in the subject.
Composition/framing: one centered subject with generous even padding; every subject pixel well separated from all four edges; strong readable silhouette at 40 pt.
Constraints: the subject must be opaque and confidently solid-filled, not hollow wire art and not merely thickened outlines. Crisp clean outer edge for chroma keying. The badge is front-facing with a balanced energetic silhouette. No numeral, number, count label, or threshold mark. No outer halo, bloom, cast shadow, energy field, black box, text, UI, frame, face, character, logo, or watermark. One subject only.
```

### 5 Activities, unnecessary correction — rejected

- **Output:** `design/badges/_rejected/activity-5-correction-1.png`
- **Template used:** `precise-object-edit` on the accepted original
- **Edit target:** the original output retained as
  `design/badges/activity-5-opaque.png`
- **Reference images passed:**
  `prototype/assets/icons/lock-body.png`,
  `prototype/assets/icons/lock-shackle.png`
- **Rejection reason:** the edit removed the intended lower-right speed fin but
  retained the matching upper-left fin, making the silhouette asymmetric. The
  edit was triggered by initially misclassifying the base bolt's inherent
  zigzag corners as extra fins; side-by-side comparison corrected that review
  error, so the symmetric original ships.

**Verbatim prompt**

```text
Use case: precise-object-edit. Image 1 is the strict edit target. Images 2 and 3 remain strict material and shading references. Remove only the lower horizontal speed fin from the left edge and the matching lower horizontal speed fin from the right edge, smoothly restoring the lightning bolt's rounded outer edge in those two small regions. Keep the upper-left and upper-right speed fins, entire bolt geometry, inner recessed bolt, exact ivory clay material, soft light-gray shading, matte lighting, centered scale, generous padding, and perfectly flat uniform solid magenta #FF00FF background unchanged. No numeral, number, count label, threshold mark, text, separate pieces, shadow, glow, logo, or watermark. Change nothing else.
```

### 10 Activities — accepted

- **Final path:** `design/badges/activity-10.png`
- **Opaque output:** `design/badges/activity-10-opaque.png`
- **Template used:** Family A canonical soft-clay hero template
- **Reference images passed:**
  `prototype/assets/icons/lock-body.png`,
  `prototype/assets/icons/lock-shackle.png`
- **Validation:** accepted; see the table row above.

**Verbatim prompt**

```text
Use case: new-asset-with-style-reference
Asset type: 1024 × 1024 ExcerLock iOS milestone badge: 10 ACTIVITIES.
Input images: Image 1 and Image 2 are strict material and shading references; match their ivory clay surface, soft neutral light-gray shading, gentle rounded volume, and matte finish exactly. Do not copy either padlock silhouette or keyhole.
Primary request: Create one single centered compact lightning-bolt milestone badge — one thick upright zigzag bolt with broad rounded corners and two short parallel swept speed fins integrated into each outer side beyond the bolt's inherent zigzag corners, plus one shallow recessed inner-bolt detail shaded light gray, all joined as one solid front-facing balanced silhouette with no pedestal or separate pieces. The subject must read instantly at 40 pt display size.
Scene/backdrop: perfectly flat, uniform solid magenta #FF00FF filling every background pixel to every corner, solely for chroma-key removal. No gradient, texture, shadow, glow, vignette, floor, reflection, particles, or lighting variation in the background.
Style/medium: soft matte 3D clay-like render; ivory white #F4F1F5 surfaces with soft neutral light-gray shading (#C9C4CC) and gentle rounded volume; recessed details are shaded soft light gray, never dark holes; no gloss, no metal, no hard shadows.
Color palette: ivory white #F4F1F5 and soft neutral light-gray #C9C4CC only in the subject. Do not use cyan, blue, teal, pink, gold, red, gray outside the listed light-gray, black, orange, or magenta in the subject.
Composition/framing: one centered subject with generous even padding; every subject pixel well separated from all four edges; strong readable silhouette at 40 pt.
Constraints: the subject must be opaque and confidently solid-filled, not hollow wire art and not merely thickened outlines. Crisp clean outer edge for chroma keying. The badge is front-facing with a balanced energetic silhouette. No numeral, number, count label, or threshold mark. No outer halo, bloom, cast shadow, energy field, black box, text, UI, frame, face, character, logo, or watermark. One subject only.
```

### Streak 365 days — accepted

- **Final path:** `design/badges/streak-365-days.png`
- **Opaque output:** `design/badges/streak-365-days-opaque.png`
- **Template used:** Family A canonical soft-clay hero template
- **Reference images passed:**
  `prototype/assets/icons/lock-body.png`,
  `prototype/assets/icons/lock-shackle.png`
- **Validation:** accepted; see the table row above.

**Verbatim prompt**

```text
Use case: new-asset-with-style-reference
Asset type: 1024 × 1024 ExcerLock iOS milestone badge: STREAK 365 DAYS.
Input images: Image 1 and Image 2 are strict material and shading references; match their ivory clay surface, soft neutral light-gray shading, gentle rounded volume, and matte finish exactly. Do not copy either padlock silhouette or keyhole.
Primary request: Create one single centered compact pinnacle flame crown badge — three tall rounded crown-flame peaks across the top with the center peak slightly tallest, flowing into three shorter stepped flame tongues on each side, with one broad shallow triple-flame recess shaded light gray, all joined into one solid front-facing symmetrical silhouette with no pedestal or separate pieces. The subject must read instantly at 40 pt display size.
Scene/backdrop: perfectly flat, uniform solid magenta #FF00FF filling every background pixel to every corner, solely for chroma-key removal. No gradient, texture, shadow, glow, vignette, floor, reflection, particles, or lighting variation in the background.
Style/medium: soft matte 3D clay-like render; ivory white #F4F1F5 surfaces with soft neutral light-gray shading (#C9C4CC) and gentle rounded volume; recessed details are shaded soft light gray, never dark holes; no gloss, no metal, no hard shadows.
Color palette: ivory white #F4F1F5 and soft neutral light-gray #C9C4CC only in the subject. Do not use cyan, blue, teal, pink, gold, red, gray outside the listed light-gray, black, orange, or magenta in the subject.
Composition/framing: one centered subject with generous even padding; every subject pixel well separated from all four edges; strong readable silhouette at 40 pt.
Constraints: the subject must be opaque and confidently solid-filled, not hollow wire art and not merely thickened outlines. Crisp clean outer edge for chroma keying. The badge is front-facing and symmetrical. No numeral, number, day label, or threshold mark. No outer halo, bloom, cast shadow, energy field, black box, text, UI, frame, face, character, logo, or watermark. One subject only.
```

### Streak 30 days, attempt 1 — rejected

- **Output:** `design/badges/_rejected/streak-30-days-attempt-1.png`
- **Template used:** Family A canonical soft-clay hero template
- **Reference images passed:**
  `prototype/assets/icons/lock-body.png`,
  `prototype/assets/icons/lock-shackle.png`
- **Rejection reason:** the generation produced only three outer flame points,
  repeating a lower-rank silhouette instead of the requested five-point
  crown-like progression. Material, palette, background, and inner recess were
  otherwise correct, so STYLE.md required a precise edit rather than a new
  generation.

**Verbatim prompt**

```text
Use case: new-asset-with-style-reference
Asset type: 1024 × 1024 ExcerLock iOS milestone badge: STREAK 30 DAYS.
Input images: Image 1 and Image 2 are strict material and shading references; match their ivory clay surface, soft neutral light-gray shading, gentle rounded volume, and matte finish exactly. Do not copy either padlock silhouette or keyhole.
Primary request: Create one single centered compact flame-shaped milestone badge — a bold crown-like flame silhouette with one tall center point, four rounded outer tongues, a broad rounded base, and one simple shallow inner-flame recess shaded light gray, front-facing and symmetrical, with no pedestal or separate pieces. The subject must read instantly at 40 pt display size.
Scene/backdrop: perfectly flat, uniform solid magenta #FF00FF filling every background pixel to every corner, solely for chroma-key removal. No gradient, texture, shadow, glow, vignette, floor, reflection, particles, or lighting variation in the background.
Style/medium: soft matte 3D clay-like render; ivory white #F4F1F5 surfaces with soft neutral light-gray shading (#C9C4CC) and gentle rounded volume; recessed details are shaded soft light gray, never dark holes; no gloss, no metal, no hard shadows.
Color palette: ivory white #F4F1F5 and soft neutral light-gray #C9C4CC only in the subject. Do not use cyan, blue, teal, pink, gold, red, gray outside the listed light-gray, black, orange, or magenta in the subject.
Composition/framing: one centered subject with generous even padding; every subject pixel well separated from all four edges; strong readable silhouette at 40 pt.
Constraints: the subject must be opaque and confidently solid-filled, not hollow wire art and not merely thickened outlines. Crisp clean outer edge for chroma keying. The badge is front-facing and symmetrical. No numeral, number, day label, or threshold mark. No outer halo, bloom, cast shadow, energy field, black box, text, UI, frame, face, character, logo, or watermark. One subject only.
```

### Streak 30 days, precise correction — accepted

- **Final path:** `design/badges/streak-30-days.png`
- **Opaque output:** `design/badges/streak-30-days-opaque.png`
- **Template used:** `precise-object-edit` on attempt 1
- **Edit target:** `design/badges/_rejected/streak-30-days-attempt-1.png`
- **Reference images passed:**
  `prototype/assets/icons/lock-body.png`,
  `prototype/assets/icons/lock-shackle.png`
- **Validation:** accepted; see the table row above.

**Verbatim prompt**

```text
Use case: precise-object-edit. Image 1 is the strict edit target. Images 2 and 3 remain strict material and shading references. Change only the outer flame silhouette: add one small rounded flame tongue on each side between the tall center point and the existing outer side tongue, producing five clearly separated outer points total in a front-facing symmetrical crown-like flame. Keep the existing inner recessed flame, broad rounded base, exact ivory clay material, soft light-gray shading, matte lighting, centered scale, padding, and perfectly flat uniform solid magenta #FF00FF background unchanged. No numeral, number, day label, threshold mark, text, separate pieces, shadow, glow, logo, or watermark. Change nothing else.
```

### Streak 60 days, attempt 1 — rejected

- **Output:** `design/badges/_rejected/streak-60-days-attempt-1.png`
- **Template used:** Family A canonical soft-clay hero template
- **Reference images passed:**
  `prototype/assets/icons/lock-body.png`,
  `prototype/assets/icons/lock-shackle.png`
- **Rejection reason:** the generation stopped at five outer flame points rather
  than the requested seven-point progression. The correct material, palette,
  background, and inner recess made it an edit candidate.

**Verbatim prompt**

```text
Use case: new-asset-with-style-reference
Asset type: 1024 × 1024 ExcerLock iOS milestone badge: STREAK 60 DAYS.
Input images: Image 1 and Image 2 are strict material and shading references; match their ivory clay surface, soft neutral light-gray shading, gentle rounded volume, and matte finish exactly. Do not copy either padlock silhouette or keyhole.
Primary request: Create one single centered compact flame-shaped milestone badge — one connected seven-point flame crown silhouette with the center point tallest and three progressively shorter rounded flame tongues on each side, a broad rounded base, and one simple shallow inner-flame recess shaded light gray, front-facing and symmetrical, with no pedestal or separate pieces. The subject must read instantly at 40 pt display size.
Scene/backdrop: perfectly flat, uniform solid magenta #FF00FF filling every background pixel to every corner, solely for chroma-key removal. No gradient, texture, shadow, glow, vignette, floor, reflection, particles, or lighting variation in the background.
Style/medium: soft matte 3D clay-like render; ivory white #F4F1F5 surfaces with soft neutral light-gray shading (#C9C4CC) and gentle rounded volume; recessed details are shaded soft light gray, never dark holes; no gloss, no metal, no hard shadows.
Color palette: ivory white #F4F1F5 and soft neutral light-gray #C9C4CC only in the subject. Do not use cyan, blue, teal, pink, gold, red, gray outside the listed light-gray, black, orange, or magenta in the subject.
Composition/framing: one centered subject with generous even padding; every subject pixel well separated from all four edges; strong readable silhouette at 40 pt.
Constraints: the subject must be opaque and confidently solid-filled, not hollow wire art and not merely thickened outlines. Crisp clean outer edge for chroma keying. The badge is front-facing and symmetrical. No numeral, number, day label, or threshold mark. No outer halo, bloom, cast shadow, energy field, black box, text, UI, frame, face, character, logo, or watermark. One subject only.
```

### Streak 60 days, precise correction — accepted

- **Final path:** `design/badges/streak-60-days.png`
- **Opaque output:** `design/badges/streak-60-days-opaque.png`
- **Template used:** `precise-object-edit` on attempt 1
- **Edit target:** `design/badges/_rejected/streak-60-days-attempt-1.png`
- **Reference images passed:**
  `prototype/assets/icons/lock-body.png`,
  `prototype/assets/icons/lock-shackle.png`
- **Validation:** accepted; see the table row above.

**Verbatim prompt**

```text
Use case: precise-object-edit. Image 1 is the strict edit target. Images 2 and 3 remain strict material and shading references. Change only the outer flame silhouette: add one new small rounded connected flame tongue at the far lower-left outer edge and one matching tongue at the far lower-right outer edge, producing seven clearly separated outer points total: one tall center point plus three progressively shorter points on each side. Keep the existing five points, inner recessed flame, broad rounded base, exact ivory clay material, soft light-gray shading, matte lighting, centered scale, generous padding, and perfectly flat uniform solid magenta #FF00FF background unchanged. No numeral, number, day label, threshold mark, text, separate pieces, shadow, glow, logo, or watermark. Change nothing else.
```

### Streak 100 days, attempt 1 — rejected

- **Output:** `design/badges/_rejected/streak-100-days-attempt-1.png`
- **Template used:** Family A canonical soft-clay hero template
- **Reference images passed:**
  `prototype/assets/icons/lock-body.png`,
  `prototype/assets/icons/lock-shackle.png`
- **Rejection reason:** the high-rank crest stopped at two prominent stepped
  tongues per side instead of the requested three. Its otherwise correct
  material, palette, backdrop, and tall silhouette were preserved through a
  precise edit.

**Verbatim prompt**

```text
Use case: new-asset-with-style-reference
Asset type: 1024 × 1024 ExcerLock iOS milestone badge: STREAK 100 DAYS.
Input images: Image 1 and Image 2 are strict material and shading references; match their ivory clay surface, soft neutral light-gray shading, gentle rounded volume, and matte finish exactly. Do not copy either padlock silhouette or keyhole.
Primary request: Create one single centered compact high-rank flame crest badge — a tall central flame rising from wide stepped flame shoulders with three bold rounded tongues along each side and one broad shallow double-flame recess shaded light gray, all joined into one solid front-facing symmetrical silhouette with no pedestal or separate pieces. The subject must read instantly at 40 pt display size.
Scene/backdrop: perfectly flat, uniform solid magenta #FF00FF filling every background pixel to every corner, solely for chroma-key removal. No gradient, texture, shadow, glow, vignette, floor, reflection, particles, or lighting variation in the background.
Style/medium: soft matte 3D clay-like render; ivory white #F4F1F5 surfaces with soft neutral light-gray shading (#C9C4CC) and gentle rounded volume; recessed details are shaded soft light gray, never dark holes; no gloss, no metal, no hard shadows.
Color palette: ivory white #F4F1F5 and soft neutral light-gray #C9C4CC only in the subject. Do not use cyan, blue, teal, pink, gold, red, gray outside the listed light-gray, black, orange, or magenta in the subject.
Composition/framing: one centered subject with generous even padding; every subject pixel well separated from all four edges; strong readable silhouette at 40 pt.
Constraints: the subject must be opaque and confidently solid-filled, not hollow wire art and not merely thickened outlines. Crisp clean outer edge for chroma keying. The badge is front-facing and symmetrical. No numeral, number, day label, or threshold mark. No outer halo, bloom, cast shadow, energy field, black box, text, UI, frame, face, character, logo, or watermark. One subject only.
```

### Streak 100 days, precise correction — accepted

- **Final path:** `design/badges/streak-100-days.png`
- **Opaque output:** `design/badges/streak-100-days-opaque.png`
- **Template used:** `precise-object-edit` on attempt 1
- **Edit target:** `design/badges/_rejected/streak-100-days-attempt-1.png`
- **Reference images passed:**
  `prototype/assets/icons/lock-body.png`,
  `prototype/assets/icons/lock-shackle.png`
- **Validation:** accepted; see the table row above. At 40 pt the three
  prominent stepped tongues per side remain distinct; the tiny outer base curl
  reads as the connected foot of the silhouette.

**Verbatim prompt**

```text
Use case: precise-object-edit. Image 1 is the strict edit target. Images 2 and 3 remain strict material and shading references. Change only the outer crest silhouette: add one new small rounded connected flame tongue at the far lower-left outer edge and one matching tongue at the far lower-right outer edge, so the tall central flame has three progressively shorter stepped tongues on each side. Keep the existing tall center flame, four existing side tongues, inner recessed flame, broad rounded base, exact ivory clay material, soft light-gray shading, matte lighting, centered scale, generous padding, and perfectly flat uniform solid magenta #FF00FF background unchanged. No numeral, number, day label, threshold mark, text, separate pieces, shadow, glow, logo, or watermark. Change nothing else.
```

### Streak 180 days — accepted

- **Final path:** `design/badges/streak-180-days.png`
- **Opaque output:** `design/badges/streak-180-days-opaque.png`
- **Template used:** Family A canonical soft-clay hero template
- **Reference images passed:**
  `prototype/assets/icons/lock-body.png`,
  `prototype/assets/icons/lock-shackle.png`
- **Validation:** accepted; see the table row above.

**Verbatim prompt**

```text
Use case: new-asset-with-style-reference
Asset type: 1024 × 1024 ExcerLock iOS milestone badge: STREAK 180 DAYS.
Input images: Image 1 and Image 2 are strict material and shading references; match their ivory clay surface, soft neutral light-gray shading, gentle rounded volume, and matte finish exactly. Do not copy either padlock silhouette or keyhole.
Primary request: Create one single centered compact elite flame crest badge — two equal tall rounded center flame peaks separated by one clean shallow notch, flowing into three progressively shorter stepped flame tongues on each side, with one broad shallow inner-flame recess shaded light gray, all joined into one solid front-facing symmetrical silhouette with no pedestal or separate pieces. The subject must read instantly at 40 pt display size.
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
