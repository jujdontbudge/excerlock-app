# ExcerLock condition banners — complete 21-asset runtime foundry

- Consolidated: 2026-08-07
- Runtime directory:
  `/Users/johansardar/ExcerLock/excer-ui-mock/assets/banners/`
- Family: C — painted condition banners
- Renderer: Codex built-in `image_gen`, GPT Image 2, one independent call per
  asset
- Style reference for every asset:
  `/Users/johansardar/ExcerLock/prototype/assets/icons/gym-card.png`
- Final contract: 1536×696, opaque RGB PNG, centered normalization, full bleed,
  no baked border or rounded corners
- Pair contract: every final has one byte-preserved `-source.png` model output
  beside it

## GPT Image 2 override and merge provenance

The user's explicit instruction supersedes the older renderer assignment in
`design/STYLE.md`: **all runtime banners in this library were generated with
GPT Image 2 through the built-in `image_gen` tool, never Higgsfield/Nano
Banana or another model.** The rest of Family C remains unchanged: the approved
gym card is the strict style reference; the visual register is
Spider-Verse-inspired stylized animation with painterly comic-film texture,
warm orange light against deep navy/indigo shadow, no visible faces, no
text/UI/logo/watermark, and a calm dark lower third for scrimmed white copy.

This file merges the exact batch A, B, and C foundry fragments. Their staged
paths were mechanically rebased from `assets/foundry/banners/` to this runtime
directory; prompts, generator origins, dimensions, checksums, and acceptance
records are otherwise preserved. The fresh weights-floor record below is the
21st asset and replaces the earlier staging attempt. The superseded
`assets/foundry/banners/gym-weights-floor(.png/-source.png)` pair is not copied
into the runtime library.

Transient `assets/foundry/banners/` staging files were intentionally deleted
after consolidation. Historical staging paths and commands remain below only
as an execution record; they are not live provenance dependencies. The
retained chain is the recorded model-store origin (where available), the
runtime `-source.png`, the runtime final, and their SHA-256 values.

## Runtime inventory — exactly 21 source/final pairs

- Gym: `gym-weights-floor`, `gym-squat-rack`, `gym-sunset-gym`,
  `gym-cable-row`.
- Running: `run-road-dawn`, `run-track`, `run-forest-trail`.
- Walking: `walk-city-sidewalk`, `walk-park-path`, `walk-night-walk`.
- Cycling: `cycle-open-road`, `cycle-mountain-climb`, `cycle-city-commute`.
- Swimming: `swim-pool-lanes`, `swim-open-water`,
  `swim-underwater-light`.
- General: `general-abstract-energy`, `general-sunrise`,
  `general-city-motion`, `general-rain-window`,
  `general-mountain-silhouette`.

Every name above has `<name>.png` and `<name>-source.png`; no other PNG belongs
in the runtime directory.

## Fresh replacement — `gym-weights-floor`

- Status: **ACCEPTED — attempt 1; selected runtime replacement**
- Generator/model: Codex built-in `image_gen` / GPT Image 2
- Model-store origin:
  `/Users/johansardar/.codex/generated_images/019fdd46-1b43-7971-9abd-588c3b00ec31/exec-999e0617-a444-4a21-a6c1-9c4a1bf27d11.png`
- Historical transient staging source (deleted after consolidation):
  `/Users/johansardar/ExcerLock/excer-ui-mock/assets/foundry/banners/gym-weights-floor-fresh-source.png`
- Runtime source:
  `/Users/johansardar/ExcerLock/excer-ui-mock/assets/banners/gym-weights-floor-source.png`
- Source dimensions/mode: 1860×845, RGB, opaque
- Source SHA-256:
  `c24e60d48e612def6b8daceb691729c158be129a14bda73122428f24d47a6f8a`
- Historical transient staging final (deleted after consolidation):
  `/Users/johansardar/ExcerLock/excer-ui-mock/assets/foundry/banners/gym-weights-floor-fresh.png`
- Runtime final:
  `/Users/johansardar/ExcerLock/excer-ui-mock/assets/banners/gym-weights-floor.png`
- Final dimensions/mode: 1536×696, RGB, opaque
- Final SHA-256:
  `20e4f50323049f3b4ef07c8652c40b4b644ba7d3cc92d475e43b6c447c0d1ee8`
- Reference passed:
  `/Users/johansardar/ExcerLock/prototype/assets/icons/gym-card.png`
- Normalization: centered crop to approximately 2.21:1, RGB conversion, and
  LANCZOS resize to 1536×696

### Verbatim prompt

```text
Use case: new-asset-with-style-reference
Asset type: ExcerLock Family C painted condition-card banner GYM 1 — WEIGHTS FLOOR, a full-bleed wide landscape illustration that will be center-cropped to 1536 × 696 pixels at approximately 2.21:1.
Input images: Image 1 is the strict ExcerLock Family C style, brush-texture, palette, and lighting reference only. Match its visual family exactly; do not copy its gym composition, crop, text, UI, or rounded corners.
Primary request: Create one wide cinematic banner illustration. Scene: a loaded barbell resting on a dark rubber gym floor, with stacked weight plates, a low bench, and tall industrial windows washing the equipment in warm orange dusk light; place the main barbell and plate detail in the middle-to-upper-right area and leave the bottom third as plain shadowed floor; no people anywhere.
Style/medium: Spider-Verse-inspired stylized animation; painterly comic-film rendering with visible brush texture, confident simplified shapes, moody cinematic depth, and no photorealism.
Color palette/lighting: warm dark palette of deep indigo and navy shadows with glowing warm orange highlights and rim light; avoid unrelated bright colors.
Composition/framing: full bleed with no baked border or rounded corners. Protect the center crop. Keep the lower third, especially lower-left and lower-right overlay zones, calm, dark, low-detail, and free of important subjects so a dark scrim and white status copy remain legible.
Constraints: no visible faces anywhere. Prefer environments and objects; any allowed figure must be tiny, distant, featureless, from behind, or a full silhouette exactly as the scene says. No text, letters, numerals, lane numbers, signage, UI, logos, app marks, frames, borders, or watermark anywhere. No magenta backdrop and no transparency.
```

### Acceptance

- PASS — the loaded barbell, stacked plates, dumbbell rack, bench, and warm
  industrial windows form one mechanically coherent gym scene.
- PASS — warm orange rim light, deep indigo/navy massing, inked simplified
  shapes, and visible painterly texture match the Family-C anchor.
- PASS — no people or visible faces; no text, letters, numerals, signage, UI,
  logos, app marks, border, rounded frame, or watermark.
- PASS — the barbell remains centered-to-right and above the copy zone; the
  complete lower third is calm shadowed floor suitable for a dark scrim and
  white overlay.
- PASS — centered normalization retains the full focal arrangement. At
  consolidation, the runtime source/final hashes matched the accepted fresh
  staging pair; the transient pair was then intentionally deleted.

## Consolidated runtime validation and visual QA

- Inventory gate: **21 finals + 21 sources = 42 PNGs**, with every required
  descriptive basename present and no unexpected PNG basename.
- Final-file gate: all 21 finals are exactly 1536×696 and `rgb24`/opaque.
- Source-file gate: all 21 `-source.png` files are `rgb24`/opaque and preserve
  their model-native dimensions.
- Copy-integrity gate: consolidation-time SHA-256 comparisons established that
  every runtime source/final was byte-identical to its accepted staging pair.
  The transient staging directory was then deleted. The recorded runtime
  hashes remain mechanically verifiable; the superseded weights-floor attempt
  is absent from runtime.
- Contact sheet:
  `/Users/johansardar/ExcerLock/work/banners-contact-sheet.jpg` — 1510×1308
  JPEG, ordered exactly as the inventory above.
- Contact-sheet visual inspection: **PASS.** All 21 read as one Family-C
  system: consistent inked painterly animation treatment, warm orange light,
  deep navy/indigo shadow, and dark lower overlay bands. Activity subjects are
  distinct at thumbnail size; the fresh weights-floor asset matches the other
  three gym banners; no cross-batch palette/style outlier is visible.
- Face/content inspection: **PASS.** Object/environment scenes contain no
  people. The running and cycling scenes use only the accepted rear-facing or
  distant featureless silhouettes; no visible face appears. No banner shows
  readable text, UI, logo, signage, frame, rounded border, or watermark.
- Overlay inspection: **PASS.** Every final leaves a calm, dark, low-detail
  lower third suitable for the shared dark scrim and white title/status/CTA.

---

## Merged batch A record — six accepted assets

### ExcerLock Family C banners — batch A foundry fragment

Generated and accepted on 2026-08-07 for the standalone ExcerLock UI mock.

#### Batch contract

- Family: C — painted banner.
- Generator: Codex built-in image_gen using GPT Image 2, one independent call per asset. This is the user's explicit override of STYLE.md's older Higgsfield tool assignment; all other Family C requirements remain in force.
- Shared style reference passed to every generation as Image 1: /Users/johansardar/ExcerLock/prototype/assets/icons/gym-card.png (1083×489, RGB). Its role was style-only: angular cel-painted forms, painterly texture, navy-charcoal shadow mass, and amber/ember rim light.
- Required output behavior: one coherent 2.21:1 scene; warm dark palette; no visible faces; no text, UI, logo, signage, or watermark; bottom third calm enough for a dark scrim and white UI copy.
- Source policy: the untouched built-in model output is preserved beside the final as NAME-source.png.
- Final normalization: Pillow 11.3.0 ImageOps.fit after RGB conversion, target (1536, 696), LANCZOS resampling, centering (0.5, 0.5), then opaque PNG save. Final ratio is exactly 64:29 (2.20689655:1).
- Visual QA: each final was opened and inspected individually at 1536×696 after normalization.
- Rejections: none. All six first-pass sources met the batch acceptance gate.

#### gym-squat-rack

- Model-store origin: /Users/johansardar/.codex/generated_images/019fdd4a-aee3-70c2-afcf-09ae582159bc/exec-7ee65d3c-0281-43f2-953d-d1ac7a6e033c.png
- Preserved source: /Users/johansardar/ExcerLock/excer-ui-mock/assets/banners/gym-squat-rack-source.png
- Source dimensions/mode: 1862×845, RGB, opaque.
- Source SHA-256: eb4025d800e980207464a5b22e0d66cc3baea4090559d858fcba283c1a399a0e
- Final: /Users/johansardar/ExcerLock/excer-ui-mock/assets/banners/gym-squat-rack.png
- Final dimensions/mode: 1536×696, RGB, opaque.
- Final SHA-256: f305de83d0d6f44b9a7bb6ffd1c5350a18021efc7079f642ff0914af7972a5cd
- Reference passed: /Users/johansardar/ExcerLock/prototype/assets/icons/gym-card.png

Verbatim prompt:

~~~text
Use case: stylized-concept
Asset type: ExcerLock Family C condition banner
Input images: Image 1 is the strict style-only reference. Match its rendering language, angular painterly shapes, warm-dark color behavior, and cinematic light. Do not copy its exact composition, barbell placement, or gym layout.
Primary request: Create one coherent wide cinematic scene of an empty heavy squat rack in a quiet gym.
Scene/backdrop: A shadowy strength-training room with a sturdy power rack, a loaded barbell resting safely on J-hooks, weight plates stored neatly nearby, and only restrained architectural detail.
Subject: The squat rack and racked barbell are the single clear focal arrangement; no people.
Style/medium: Same Spider-Verse-inspired stylized animation style as Image 1, with graphic cel-painted planes, confident angular brush shapes, subtle paper-like texture, and cinematic depth.
Composition/framing: Native wide 2.21:1 banner composition, edge-to-edge single scene, designed to center-crop cleanly to 1536×696. Keep the primary rack in the upper and middle thirds. Leave the entire bottom third calm, dark, low-detail, and unobstructed so a dark scrim and white overlay copy remain legible. Keep important content away from the outer 6%.
Lighting/mood: Warm amber overhead and rim light against deep navy-charcoal shadows; focused, calm, capable, never aggressive.
Color palette: Warm dark palette matching Image 1: near-black navy, smoked charcoal, muted burnt orange, ember red, and restrained golden highlights.
Text: none.
Constraints: No visible faces anywhere. No people. No text, letters, numbers, UI, logo, signage, brand marks, watermark, border, split panels, collage, or multiple scenes. One coherent environment only.
Avoid: photorealism, glossy 3D rendering, bright white background, neon rainbow colors, busy detail in the bottom third, warped gym equipment, floating parts.
~~~

Acceptance:

- PASS — empty squat rack, loaded bar, J-hooks, and stored plates read as one mechanically coherent focal scene.
- PASS — angular cel-painted rendering, navy-charcoal shadows, and amber edge light closely track the anchor.
- PASS — lower third is dark, low-detail floor and accepts a scrim/white-copy overlay.
- PASS — no people or faces; no text, UI, logo, signage, watermark, border, or collage.
- PASS — center normalization retains the full rack silhouette and does not crop critical content.

#### gym-sunset-gym

- Model-store origin: /Users/johansardar/.codex/generated_images/019fdd4a-aee3-70c2-afcf-09ae582159bc/exec-5e60b8a2-1423-446a-b56e-a46ac6535adb.png
- Preserved source: /Users/johansardar/ExcerLock/excer-ui-mock/assets/banners/gym-sunset-gym-source.png
- Source dimensions/mode: 1886×834, RGB, opaque.
- Source SHA-256: aeb377a793d38b9d9420def38dac64421a1cabfad4b6801db60eda0abab45250
- Final: /Users/johansardar/ExcerLock/excer-ui-mock/assets/banners/gym-sunset-gym.png
- Final dimensions/mode: 1536×696, RGB, opaque.
- Final SHA-256: 7e4cd4ab0c09379a16b6cbe3bcbfca61f5267b1dc888ee43a8c3e1c9d5b5ffaf
- Reference passed: /Users/johansardar/ExcerLock/prototype/assets/icons/gym-card.png

Verbatim prompt:

~~~text
Use case: stylized-concept
Asset type: ExcerLock Family C condition banner
Input images: Image 1 is the strict style-only reference. Match its rendering language, angular painterly shapes, warm-dark color behavior, and cinematic light. Do not copy its exact composition, barbell placement, or gym layout.
Primary request: Create one coherent wide cinematic scene of an empty modern gym glowing at sunset.
Scene/backdrop: A spacious strength gym with broad windows facing a molten orange sunset, restrained rows of benches and free weights in silhouette, and quiet polished flooring.
Subject: The unified sunset-lit gym environment is the focus; no people and no single oversized foreground prop.
Style/medium: Same Spider-Verse-inspired stylized animation style as Image 1, with graphic cel-painted planes, confident angular brush shapes, subtle paper-like texture, and cinematic depth.
Composition/framing: Native wide 2.21:1 banner composition, edge-to-edge single scene, designed to center-crop cleanly to 1536×696. Place the glowing window horizon and equipment silhouettes in the upper and middle thirds. Leave the entire bottom third calm, dark, low-detail, and unobstructed so a dark scrim and white overlay copy remain legible. Keep important content away from the outer 6%.
Lighting/mood: Low warm sunset pours through the windows as amber and ember rim light against deep navy-charcoal shadows; restorative, atmospheric, and calm.
Color palette: Warm dark palette matching Image 1: near-black navy, smoked charcoal, muted burnt orange, ember red, and restrained golden highlights.
Text: none.
Constraints: No visible faces anywhere. No people. No text, letters, numbers, UI, logo, signage, brand marks, watermark, border, split panels, collage, or multiple scenes. One coherent environment only.
Avoid: photorealism, glossy 3D rendering, bright white background, neon rainbow colors, busy detail in the bottom third, warped equipment, duplicated objects, floating parts.
~~~

Acceptance:

- PASS — a single sunset-lit gym interior reads immediately without an oversized competing prop.
- PASS — warm skyline, graphic reflections, dark equipment silhouettes, and angular painterly treatment remain in Family C.
- PASS — the floor becomes progressively darker and calmer through the lower third, leaving robust overlay space.
- PASS — no people or faces; no text, UI, logo, signage, watermark, border, or collage.
- PASS — the slight horizontal source trim preserves both equipment framing and the sunset focal window.

#### gym-cable-row

- Model-store origin: /Users/johansardar/.codex/generated_images/019fdd4a-aee3-70c2-afcf-09ae582159bc/exec-cde4a185-0976-40d6-a4f4-bfd2733d855c.png
- Preserved source: /Users/johansardar/ExcerLock/excer-ui-mock/assets/banners/gym-cable-row-source.png
- Source dimensions/mode: 1866×843, RGB, opaque.
- Source SHA-256: 767e7c0ceeee7a8682871140372697300a8d9fe3b716d29b0bfe688df233718b
- Final: /Users/johansardar/ExcerLock/excer-ui-mock/assets/banners/gym-cable-row.png
- Final dimensions/mode: 1536×696, RGB, opaque.
- Final SHA-256: e0a8621a51f4dc8d3899cfad344cac85fa2718823de966e0abe159e6d71977f3
- Reference passed: /Users/johansardar/ExcerLock/prototype/assets/icons/gym-card.png

Verbatim prompt:

~~~text
Use case: stylized-concept
Asset type: ExcerLock Family C condition banner
Input images: Image 1 is the strict style-only reference. Match its rendering language, angular painterly shapes, warm-dark color behavior, and cinematic light. Do not copy its exact composition, barbell placement, or gym layout.
Primary request: Create one coherent wide cinematic scene focused on an empty seated cable-row station in a quiet gym.
Scene/backdrop: A shadowy training room containing one mechanically plausible low cable-row machine with a padded seat, foot braces, weight stack, cable, and close-grip handle, plus only restrained background equipment.
Subject: The complete cable-row station is the single clear focal arrangement; no people.
Style/medium: Same Spider-Verse-inspired stylized animation style as Image 1, with graphic cel-painted planes, confident angular brush shapes, subtle paper-like texture, and cinematic depth.
Composition/framing: Native wide 2.21:1 banner composition, edge-to-edge single scene, designed to center-crop cleanly to 1536×696. Place the machine in the upper and middle thirds with its silhouette and cable path easy to read. Leave the entire bottom third calm, dark, low-detail, and unobstructed so a dark scrim and white overlay copy remain legible. Keep important content away from the outer 6%.
Lighting/mood: Warm amber side light and ember rim light against deep navy-charcoal shadows; deliberate, quiet, and focused.
Color palette: Warm dark palette matching Image 1: near-black navy, smoked charcoal, muted burnt orange, ember red, and restrained golden highlights.
Text: none.
Constraints: No visible faces anywhere. No people. No text, letters, numbers, UI, logo, signage, brand marks, watermark, border, split panels, collage, or multiple scenes. One coherent environment only.
Avoid: photorealism, glossy 3D rendering, bright white background, neon rainbow colors, busy detail in the bottom third, impossible cable routing, warped machine geometry, duplicated handles, floating parts.
~~~

Acceptance:

- PASS — seat, foot braces, cable, pulley, handle, and weight stack read together as one seated cable-row station.
- PASS — treatment uses the anchor's dark massing, amber-orange rim light, angular planes, and painterly surface.
- PASS — machine remains above the overlay zone while the bottom third is a calm dark floor.
- PASS — no people or faces; no text, UI, logo, signage, watermark, border, or collage.
- PASS — near-native source ratio required only a minimal centered trim; no machine component was clipped.

#### run-road-dawn

- Model-store origin: /Users/johansardar/.codex/generated_images/019fdd4a-aee3-70c2-afcf-09ae582159bc/exec-cf05e086-6900-44af-9abc-9c23f808e786.png
- Preserved source: /Users/johansardar/ExcerLock/excer-ui-mock/assets/banners/run-road-dawn-source.png
- Source dimensions/mode: 1866×843, RGB, opaque.
- Source SHA-256: 839d053c282e2efda6f963477b2fce3bf0b28dbbe10484c03ea60a3d91070b7d
- Final: /Users/johansardar/ExcerLock/excer-ui-mock/assets/banners/run-road-dawn.png
- Final dimensions/mode: 1536×696, RGB, opaque.
- Final SHA-256: dd8a6c1cdcf486d1dc406981ff9e6f7860892ed6479a0b8779b6bda361441daf
- Reference passed: /Users/johansardar/ExcerLock/prototype/assets/icons/gym-card.png

Verbatim prompt:

~~~text
Use case: stylized-concept
Asset type: ExcerLock Family C condition banner
Input images: Image 1 is the strict style-only reference. Match its rendering language, angular painterly shapes, warm-dark color behavior, and cinematic light. Do not copy its gym subject, exact composition, barbell placement, or interior layout.
Primary request: Create one coherent wide cinematic scene of a lone runner moving away along an empty road at dawn.
Scene/backdrop: A gently winding two-lane road crossing a quiet dark landscape toward a warm dawn horizon, with restrained hills and atmospheric distance but no buildings or signs.
Subject: One small athletic runner seen strictly from behind, moving toward the sunrise; the back of the head and body are visible only as a dark stylized silhouette, with the face completely impossible to see.
Style/medium: Same Spider-Verse-inspired stylized animation style as Image 1, with graphic cel-painted planes, confident angular brush shapes, subtle paper-like texture, and cinematic depth.
Composition/framing: Native wide 2.21:1 banner composition, edge-to-edge single scene, designed to center-crop cleanly to 1536×696. Keep the runner small in the upper-middle third and the road leading toward the horizon. Leave the entire bottom third as calm, dark, low-detail asphalt and shadow so a dark scrim and white overlay copy remain legible. Keep important content away from the outer 6%.
Lighting/mood: Cool predawn navy shadows with a restrained amber-orange horizon and warm rim light; hopeful, solitary, steady, and calm.
Color palette: Warm dark palette matching Image 1: near-black navy, smoked charcoal, muted burnt orange, ember red, and restrained golden highlights.
Text: none.
Constraints: No visible faces anywhere. Exactly one runner, strictly rear view, face fully hidden. No text, letters, numbers, UI, logo, road signage, brand marks, watermark, border, split panels, collage, or multiple scenes. One coherent environment only.
Avoid: photorealism, glossy 3D rendering, bright daylight, neon rainbow colors, busy detail in the bottom third, front-facing or profile faces, crowds, cars, warped limbs, duplicated body parts.
~~~

Acceptance:

- PASS — one small runner moves away along a single coherent dawn road; pose is readable and anatomically plausible at banner scale.
- PASS — runner is strictly rear-facing and silhouetted; no facial detail is visible.
- PASS — graphic dawn sky, angular paint blocks, navy road, and amber edge light fit the anchor-derived palette.
- PASS — lower third is uninterrupted dark asphalt with ample scrim and white-copy legibility.
- PASS — no text, UI, logos, road signs, watermarks, borders, crowds, cars, or collage artifacts.
- PASS — centered normalization preserves the runner, horizon, and full leading-road rhythm.

#### run-track

- Model-store origin: /Users/johansardar/.codex/generated_images/019fdd4a-aee3-70c2-afcf-09ae582159bc/exec-ec76816c-9377-46b1-9a59-734d8f2c5e36.png
- Preserved source: /Users/johansardar/ExcerLock/excer-ui-mock/assets/banners/run-track-source.png
- Source dimensions/mode: 1866×843, RGB, opaque.
- Source SHA-256: dc10c91a6706bb739ed316c958708570242b7f419bdb7e3e821352da1d4155e2
- Final: /Users/johansardar/ExcerLock/excer-ui-mock/assets/banners/run-track.png
- Final dimensions/mode: 1536×696, RGB, opaque.
- Final SHA-256: 40d0def01362dcb5fb6b0c5901050ee117f97029511c39cdacfd38d8923ddc62
- Reference passed: /Users/johansardar/ExcerLock/prototype/assets/icons/gym-card.png

Verbatim prompt:

~~~text
Use case: stylized-concept
Asset type: ExcerLock Family C condition banner
Input images: Image 1 is the strict style-only reference. Match its rendering language, angular painterly shapes, warm-dark color behavior, and cinematic light. Do not copy its gym subject, exact composition, barbell placement, or interior layout.
Primary request: Create one coherent wide cinematic scene of a lone runner training on an outdoor athletics track at first light.
Scene/backdrop: A quiet oval running track with clean curving lane lines, dark infield, low empty bleachers, and a restrained amber dawn sky; no signage or lane numbers.
Subject: One small athletic runner seen strictly from behind on the curve, moving away; the back of the head and body are visible only as a dark stylized silhouette, with the face completely impossible to see.
Style/medium: Same Spider-Verse-inspired stylized animation style as Image 1, with graphic cel-painted planes, confident angular brush shapes, subtle paper-like texture, and cinematic depth.
Composition/framing: Native wide 2.21:1 banner composition, edge-to-edge single scene, designed to center-crop cleanly to 1536×696. Put the runner small in the upper-middle third and use the curving lanes as a single leading rhythm. Leave the entire bottom third as calm, dark, low-detail track surface so a dark scrim and white overlay copy remain legible. Keep important content away from the outer 6%.
Lighting/mood: Cool predawn navy shadows with warm amber-orange rim light grazing the track; disciplined, quiet, and optimistic.
Color palette: Warm dark palette matching Image 1: near-black navy, smoked charcoal, muted burnt orange, ember red, and restrained golden highlights.
Text: none.
Constraints: No visible faces anywhere. Exactly one runner, strictly rear view, face fully hidden. No text, letters, numbers, UI, logo, lane numbers, signage, brand marks, watermark, border, split panels, collage, or multiple scenes. One coherent environment only.
Avoid: photorealism, glossy 3D rendering, bright midday light, neon rainbow colors, busy detail in the bottom third, front-facing or profile faces, crowds, warped lane geometry, extra limbs, duplicated body parts.
~~~

Acceptance:

- PASS — one rear-facing runner, curved lanes, empty bleachers, and dark infield form a coherent athletics-track scene.
- PASS — no face is visible; the figure is small and fully rear-facing with plausible limb structure.
- PASS — lane rhythm remains clean, continuous, and free of lane numbers or signage.
- PASS — the lower track surface is dark and low-detail enough for a scrim/white-copy overlay.
- PASS — no text, UI, logos, watermarks, border, crowds, or collage artifacts.
- PASS — centered normalization preserves the runner and track curve without clipping.

#### run-forest-trail

- Model-store origin: /Users/johansardar/.codex/generated_images/019fdd4a-aee3-70c2-afcf-09ae582159bc/exec-98361bf9-899c-4ccd-a85a-632c3e58b3fc.png
- Preserved source: /Users/johansardar/ExcerLock/excer-ui-mock/assets/banners/run-forest-trail-source.png
- Source dimensions/mode: 1866×843, RGB, opaque.
- Source SHA-256: 9550909002664bb79e1fa2d78d2665301255985703d51c45704b2c9b0c431bf9
- Final: /Users/johansardar/ExcerLock/excer-ui-mock/assets/banners/run-forest-trail.png
- Final dimensions/mode: 1536×696, RGB, opaque.
- Final SHA-256: 9020f699ed4177f588a7027c61afb159e3d983114885870c30b6acd8f5624698
- Reference passed: /Users/johansardar/ExcerLock/prototype/assets/icons/gym-card.png

Verbatim prompt:

~~~text
Use case: stylized-concept
Asset type: ExcerLock Family C condition banner
Input images: Image 1 is the strict style-only reference. Match its rendering language, angular painterly shapes, warm-dark color behavior, and cinematic light. Do not copy its gym subject, exact composition, barbell placement, or interior layout.
Primary request: Create one coherent wide cinematic scene of a lone trail runner moving away through a dark forest at dawn.
Scene/backdrop: A broad earthen trail winding between tall shadowed trees, with sparse undergrowth, atmospheric depth, and restrained warm shafts of early light filtering through the canopy.
Subject: One small athletic runner seen strictly from behind farther up the trail; the back of the head and body are visible only as a dark stylized silhouette, with the face completely impossible to see.
Style/medium: Same Spider-Verse-inspired stylized animation style as Image 1, with graphic cel-painted planes, confident angular brush shapes, subtle paper-like texture, and cinematic depth.
Composition/framing: Native wide 2.21:1 banner composition, edge-to-edge single scene, designed to center-crop cleanly to 1536×696. Keep the runner small in the upper-middle third and let the trail create a single clear path into the scene. Leave the entire bottom third as calm, dark, low-detail trail and soft shadow so a dark scrim and white overlay copy remain legible. Keep important content away from the outer 6%.
Lighting/mood: Deep navy forest shade cut by restrained amber-orange dawn shafts and warm rim light; grounded, adventurous, restorative, and calm.
Color palette: Warm dark palette matching Image 1: near-black navy, smoked charcoal, muted burnt orange, ember red, and restrained golden highlights, with only very subdued earthy brown.
Text: none.
Constraints: No visible faces anywhere. Exactly one runner, strictly rear view, face fully hidden. No text, letters, numbers, UI, logo, trail signage, brand marks, watermark, border, split panels, collage, or multiple scenes. One coherent environment only.
Avoid: photorealism, glossy 3D rendering, bright green foliage, neon rainbow colors, busy detail in the bottom third, front-facing or profile faces, crowds, animals, warped limbs, duplicated body parts.
~~~

Acceptance:

- PASS — one small rear runner and one continuous forest trail create a single legible scene with strong depth.
- PASS — face is fully hidden; no front/profile detail or extra figure is present.
- PASS — navy-black trunks, ember-lit foliage, angular painterly texture, and warm shafts align with Family C.
- PASS — lower trail and foreground shadows stay quiet and dark for scrim/white-copy use.
- PASS — no text, UI, logos, trail signs, watermarks, animals, border, or collage artifacts.
- PASS — centered normalization preserves the runner, trail, light shaft, and forest framing.

#### Batch acceptance summary

| Asset | Source | Final | Opaque RGB | Family C style | Face gate | Text/logo gate | Calm lower third | Result |
|---|---:|---:|:---:|:---:|:---:|:---:|:---:|:---:|
| gym-squat-rack | 1862×845 | 1536×696 | PASS | PASS | PASS — no people | PASS | PASS | ACCEPTED |
| gym-sunset-gym | 1886×834 | 1536×696 | PASS | PASS | PASS — no people | PASS | PASS | ACCEPTED |
| gym-cable-row | 1866×843 | 1536×696 | PASS | PASS | PASS — no people | PASS | PASS | ACCEPTED |
| run-road-dawn | 1866×843 | 1536×696 | PASS | PASS | PASS — rear silhouette | PASS | PASS | ACCEPTED |
| run-track | 1866×843 | 1536×696 | PASS | PASS | PASS — rear silhouette | PASS | PASS | ACCEPTED |
| run-forest-trail | 1866×843 | 1536×696 | PASS | PASS | PASS — rear silhouette | PASS | PASS | ACCEPTED |

---

## Merged batch B record — seven accepted assets

### Foundry banners — Family C, batch B

Generated 2026-08-07 with the built-in GPT Image 2 ImageGen workflow, one call per asset. At generation time this was a batch-specific fragment and the shared manifest was intentionally untouched; the record is now merged here.

#### Shared constraints and validation

- Family: C — painted condition banners.
- Style reference supplied to every generation call: /Users/johansardar/ExcerLock/prototype/assets/icons/gym-card.png (1083 × 489 px, RGB, opaque).
- Destination: /Users/johansardar/ExcerLock/excer-ui-mock/assets/banners/.
- Model output is preserved byte-for-byte as each *-source.png.
- Production transform: center crop to the 1536:696 target ratio, convert to RGB, resize to 1536 × 696 with Pillow LANCZOS, and save as an opaque PNG.
- Visual gates: coherent single scene; same warm-dark Spider-Verse-inspired painted-animation family as the anchor; correct activity/place; no visible face; no text, UI, logo, signature, or watermark; calm dark lower third suitable for a dark scrim and white overlay.
- Mechanical gates: all seven production PNGs are 1536 × 696, RGB, and opaque. In every image the measured mean luminance of the bottom third is lower than the mean luminance of the upper two-thirds.
- OCR was used as a secondary heuristic only. It returned no text for six images. It returned a nonsensical false positive on walk-night-walk from railing/building edges; direct visual inspection confirmed that the artwork contains no text.

#### walk-city-sidewalk

- Source: /Users/johansardar/ExcerLock/excer-ui-mock/assets/banners/walk-city-sidewalk-source.png
- Source SHA-256: 0b93640b7ace7924fa597287f1abac3f1fb39dfa91ddfb2b723ccf7717c6c69a
- Source dimensions: 1871 × 840 px, RGB, opaque.
- Production: /Users/johansardar/ExcerLock/excer-ui-mock/assets/banners/walk-city-sidewalk.png
- Center crop box: (8, 0)–(1862, 840), yielding 1854 × 840 before resize.
- Final dimensions: 1536 × 696 px, RGB, opaque.
- SHA-256: a86ec27be2a4be1dce79a8930670aa952a14f085d0b9b7191cabd867908b9100
- Lower-third luminance: 12.09 versus 39.58 for the upper two-thirds.
- Reference: /Users/johansardar/ExcerLock/prototype/assets/icons/gym-card.png
- Acceptance: **Accepted.** Empty tree-lined city sidewalk, strong receding path, warm orange window light and deep navy/charcoal shadows. The scene matches the anchor’s graphic painted linework, contains no faces or text, and provides a broad near-black lower third with no competing subject detail.

Exact prompt:

    Use case: stylized-concept
    Asset type: ExcerLock Family C condition banner.

    Input image: Image 1 is the strict style reference for rendering language, painterly graphic linework, faceted shapes, cinematic lighting, warm-dark color treatment, texture, and finish. Preserve that exact visual family, but do not reproduce its gym subject or objects.

    Primary request: Create a quiet city-sidewalk walking scene at golden-hour dusk: a long pedestrian sidewalk receding through a warm urban block, mature street trees, low storefront architecture without any signs or lettering, subtle pools of amber light, and textured pavement. Prefer an empty scene with no people.

    Style and medium: Match the reference image closely in the same Spider-Verse-inspired stylized animation style—graphic painterly shapes, confident illustrated edges, subtle halftone-like texture, dramatic warm highlights, deep cool shadows, and a premium cinematic animation-frame finish.

    Composition and framing: An extremely wide 2.21:1 landscape banner, one coherent continuous scene. Use strong path perspective into the upper-middle distance. Keep important visual detail in the upper and middle two-thirds. Leave the entire bottom third deliberately calm, darker, low-contrast, and low-detail so a dark scrim and white UI copy can sit over it. Maintain crop-safe space across the width.

    Lighting and mood: Warm dark palette; burnt orange, amber, rust, charcoal, midnight navy, and muted deep blue. Calm, inviting, physical, and rewarding—never ominous.

    Hard constraints: No visible faces anywhere. No text, typography, numbers, UI, logo, signature, watermark, readable signage, brand marks, collage, split panels, border, or frame. If any incidental human figure appears, it must be very small and shown only from behind or as a featureless silhouette with zero facial detail. One coherent environment. Fully opaque image.

    Avoid: photorealism, glossy 3D, stock-photo aesthetics, anime styling, bright pastels, neon cyberpunk, clutter in the bottom third, floating objects, duplicated scene elements, or multiple scenes.

#### walk-park-path

- Source: /Users/johansardar/ExcerLock/excer-ui-mock/assets/banners/walk-park-path-source.png
- Source SHA-256: 80203049f642678ebd2c2773611374fdbce86eb45d6389f57d3864e59bc474f0
- Source dimensions: 1885 × 834 px, RGB, opaque.
- Production: /Users/johansardar/ExcerLock/excer-ui-mock/assets/banners/walk-park-path.png
- Center crop box: (22, 0)–(1863, 834), yielding 1841 × 834 before resize.
- Final dimensions: 1536 × 696 px, RGB, opaque.
- SHA-256: f0f78e7b4f8904609c768b4b0723f91cab65544262dc6a62fee3f463c830fb0d
- Lower-third luminance: 12.24 versus 44.59 for the upper two-thirds.
- Reference: /Users/johansardar/ExcerLock/prototype/assets/icons/gym-card.png
- Acceptance: **Accepted.** A single winding park path framed by trees, benches, low amber lights, and a distant skyline. No people, faces, text, logos, or signage. The illuminated curve stays above the overlay zone while the lower third falls to dark, quiet pavement and foliage.

Exact prompt:

    Use case: stylized-concept
    Asset type: ExcerLock Family C condition banner.

    Input image: Image 1 is the strict style reference for rendering language, painterly graphic linework, faceted shapes, cinematic lighting, warm-dark color treatment, texture, and finish. Preserve that exact visual family, but do not reproduce its gym subject or objects.

    Primary request: Create a serene walking path in a leafy city park at late golden hour: a broad winding pedestrian path curving through mature trees, understated benches and low path lights, layered foliage, and a warm sunset glow filtering between trunks. Prefer an empty scene with no people.

    Style and medium: Match the reference image closely in the same Spider-Verse-inspired stylized animation style—graphic painterly shapes, confident illustrated edges, subtle halftone-like texture, dramatic warm highlights, deep cool shadows, and a premium cinematic animation-frame finish.

    Composition and framing: An extremely wide 2.21:1 landscape banner, one coherent continuous scene. Let the curving path carry the eye into the upper-middle distance. Keep important visual detail in the upper and middle two-thirds. Leave the entire bottom third deliberately calm, darker, low-contrast, and low-detail so a dark scrim and white UI copy can sit over it. Maintain crop-safe space across the width.

    Lighting and mood: Warm dark palette; burnt orange, amber, rust, charcoal, midnight navy, muted deep green, and muted deep blue. Calm, restorative, inviting, physical, and rewarding—never ominous.

    Hard constraints: No visible faces anywhere. No text, typography, numbers, UI, logo, signature, watermark, readable signage, brand marks, collage, split panels, border, or frame. If any incidental human figure appears, it must be very small and shown only from behind or as a featureless silhouette with zero facial detail. One coherent environment. Fully opaque image.

    Avoid: photorealism, glossy 3D, stock-photo aesthetics, anime styling, bright pastels, neon cyberpunk, clutter in the bottom third, floating objects, duplicated scene elements, or multiple scenes.

#### walk-night-walk

- Source: /Users/johansardar/ExcerLock/excer-ui-mock/assets/banners/walk-night-walk-source.png
- Source SHA-256: ee9bce7209bcd08e90bf5a990ea3f6dfb4af934f8b544b4b5aa095f5923ccb93
- Source dimensions: 1884 × 835 px, RGB, opaque.
- Production: /Users/johansardar/ExcerLock/excer-ui-mock/assets/banners/walk-night-walk.png
- Center crop box: (20, 0)–(1863, 835), yielding 1843 × 835 before resize.
- Final dimensions: 1536 × 696 px, RGB, opaque.
- SHA-256: c677871bcbf13788e99936c09a63289e2a041b9cc87e1e085030944d787c107e
- Lower-third luminance: 12.08 versus 23.76 for the upper two-thirds.
- Reference: /Users/johansardar/ExcerLock/prototype/assets/icons/gym-card.png
- Acceptance: **Accepted.** Quiet empty riverside promenade with a strong sequence of amber lamps and reflections against midnight blue. No people or visible faces and no actual text; OCR’s stray “\ |: ne nnocage” was visually confirmed as edge-pattern noise. The foreground promenade is subdued and overlay-safe.

Exact prompt:

    Use case: stylized-concept
    Asset type: ExcerLock Family C condition banner.

    Input image: Image 1 is the strict style reference for rendering language, painterly graphic linework, faceted shapes, cinematic lighting, warm-dark color treatment, texture, and finish. Preserve that exact visual family, but do not reproduce its gym subject or objects.

    Primary request: Create a peaceful nighttime walking scene along a quiet urban riverside promenade: a broad pedestrian path receding beside dark water, evenly spaced amber street lamps, a few trees and low railings, distant city silhouettes without signs, and soft warm reflections on the pavement and water. Prefer an empty scene with no people.

    Style and medium: Match the reference image closely in the same Spider-Verse-inspired stylized animation style—graphic painterly shapes, confident illustrated edges, subtle halftone-like texture, dramatic warm highlights, deep cool shadows, and a premium cinematic animation-frame finish.

    Composition and framing: An extremely wide 2.21:1 landscape banner, one coherent continuous scene. Use the promenade and river edge as strong leading lines into the upper-middle distance. Keep important visual detail in the upper and middle two-thirds. Leave the entire bottom third deliberately calm, darker, low-contrast, and low-detail so a dark scrim and white UI copy can sit over it. Maintain crop-safe space across the width.

    Lighting and mood: Warm dark nighttime palette; deep midnight navy, charcoal, muted blue-black, burnt orange, and amber pools of lamplight. Calm, safe, meditative, inviting, and rewarding—never ominous or threatening.

    Hard constraints: No visible faces anywhere. No text, typography, numbers, UI, logo, signature, watermark, readable signage, brand marks, collage, split panels, border, or frame. If any incidental human figure appears, it must be very small and shown only from behind or as a featureless silhouette with zero facial detail. One coherent environment. Fully opaque image.

    Avoid: photorealism, glossy 3D, stock-photo aesthetics, anime styling, bright pastels, neon cyberpunk, horror mood, clutter in the bottom third, floating objects, duplicated scene elements, or multiple scenes.

#### cycle-open-road

- Source: /Users/johansardar/ExcerLock/excer-ui-mock/assets/banners/cycle-open-road-source.png
- Source SHA-256: 4511dc2170f48e22889b91589d1224db3a174e433811fe92d0ef823ca43b0cf3
- Source dimensions: 1864 × 843 px, RGB, opaque.
- Production: /Users/johansardar/ExcerLock/excer-ui-mock/assets/banners/cycle-open-road.png
- Center crop box: (2, 0)–(1862, 843), yielding 1860 × 843 before resize.
- Final dimensions: 1536 × 696 px, RGB, opaque.
- SHA-256: c99c1794be7bc050d413905dd2ee63ae68128ebb398e9fb3f5edec595a993748
- Lower-third luminance: 10.27 versus 57.32 for the upper two-thirds.
- Reference: /Users/johansardar/ExcerLock/prototype/assets/icons/gym-card.png
- Acceptance: **Accepted.** One coherent rural road and exactly one small cyclist riding away toward the warm horizon. Rider and bicycle read cleanly; helmet and rear view eliminate facial detail. There is no text, traffic, logo, or duplicated figure, and the lower road fades to an exceptionally calm dark overlay zone.

Exact prompt:

    Use case: stylized-concept
    Asset type: ExcerLock Family C condition banner.

    Input image: Image 1 is the strict style reference for rendering language, painterly graphic linework, faceted shapes, cinematic lighting, warm-dark color treatment, texture, and finish. Preserve that exact visual family, but do not reproduce its gym subject or objects.

    Primary request: Create an open-road cycling scene at sunset: a smooth two-lane rural road sweeping toward a distant horizon through low rolling fields, with one small athletic cyclist riding away from the viewer in the upper-middle distance. The rider must be shown strictly from behind, wearing a simple dark helmet and unbranded clothing, with no face or facial detail visible.

    Style and medium: Match the reference image closely in the same Spider-Verse-inspired stylized animation style—graphic painterly shapes, confident illustrated edges, subtle halftone-like texture, dramatic warm highlights, deep cool shadows, and a premium cinematic animation-frame finish.

    Composition and framing: An extremely wide 2.21:1 landscape banner, one coherent continuous scene. Use the road as a strong leading line toward the small rear-view cyclist and glowing horizon. Keep the cyclist and important landscape detail in the upper and middle two-thirds. Leave the entire bottom third deliberately calm, darker, low-contrast, and low-detail so a dark scrim and white UI copy can sit over it. Maintain crop-safe space across the width.

    Lighting and mood: Warm dark palette; burnt orange sunset, amber rim light, rust-toned earth, charcoal, midnight navy, and muted deep blue shadows. Expansive, energizing, calm, physical, and rewarding—never aggressive.

    Hard constraints: No visible faces anywhere; the cyclist is seen only from behind and the helmet fully obscures the head and face. No text, typography, numbers, UI, logo, signature, watermark, readable road markings that resemble text, signage, brand marks, collage, split panels, border, or frame. Exactly one cyclist. One coherent environment. Fully opaque image.

    Avoid: photorealism, glossy 3D, stock-photo aesthetics, anime styling, bright pastels, neon cyberpunk, racing crowds, vehicles, clutter in the bottom third, floating objects, duplicated bicycle parts, extra limbs, duplicated figures, or multiple scenes.

#### cycle-mountain-climb

- Source: /Users/johansardar/ExcerLock/excer-ui-mock/assets/banners/cycle-mountain-climb-source.png
- Source SHA-256: 2ffa0b93ca215f214fd9d505170bec71ff39d66959720c9484e2ad7ff35e2e2e
- Source dimensions: 1862 × 845 px, RGB, opaque.
- Production: /Users/johansardar/ExcerLock/excer-ui-mock/assets/banners/cycle-mountain-climb.png
- Center crop box: (0, 0)–(1862, 844), yielding 1862 × 844 before resize.
- Final dimensions: 1536 × 696 px, RGB, opaque.
- SHA-256: 0bd0a4327201bc0031b9cc40a40f7c2cb0b0e02e1eff5b4935d588d6817c6a99
- Lower-third luminance: 11.08 versus 52.22 for the upper two-thirds.
- Reference: /Users/johansardar/ExcerLock/prototype/assets/icons/gym-card.png
- Acceptance: **Accepted.** Mountain switchback, lit ridge, and one small rear-view cyclist form a clear climb story. Rider is helmeted with no face, bicycle anatomy reads cleanly, and no text, branding, crowd, or vehicle appears. Dark foreground asphalt supplies a broad calm lower third.

Exact prompt:

    Use case: stylized-concept
    Asset type: ExcerLock Family C condition banner.

    Input image: Image 1 is the strict style reference for rendering language, painterly graphic linework, faceted shapes, cinematic lighting, warm-dark color treatment, texture, and finish. Preserve that exact visual family, but do not reproduce its gym subject or objects.

    Primary request: Create a mountain-climb cycling scene near sunset: a steep paved switchback ascending through dark rocky slopes and sparse pines toward a glowing high ridge, with one small determined cyclist climbing away from the viewer in the upper-middle distance. The rider must be shown strictly from behind, wearing a simple dark helmet and unbranded clothing, with no face or facial detail visible.

    Style and medium: Match the reference image closely in the same Spider-Verse-inspired stylized animation style—graphic painterly shapes, confident illustrated edges, subtle halftone-like texture, dramatic warm highlights, deep cool shadows, and a premium cinematic animation-frame finish.

    Composition and framing: An extremely wide 2.21:1 landscape banner, one coherent continuous scene. Use the climbing switchback as a strong diagonal leading line toward the small rear-view cyclist and illuminated ridge. Keep the cyclist, ridge, and important terrain detail in the upper and middle two-thirds. Leave the entire bottom third deliberately calm, darker, low-contrast, and low-detail so a dark scrim and white UI copy can sit over it. Maintain crop-safe space across the width.

    Lighting and mood: Warm dark palette; burnt orange and amber at the ridge, rust and deep umber rock, charcoal, midnight navy, muted pine green, and deep blue shadows. Challenging but uplifting, physical, heroic, and rewarding—never dangerous or hostile.

    Hard constraints: No visible faces anywhere; the cyclist is seen only from behind and the helmet fully obscures the head and face. No text, typography, numbers, UI, logo, signature, watermark, readable signage, brand marks, collage, split panels, border, or frame. Exactly one cyclist. One coherent environment. Fully opaque image.

    Avoid: photorealism, glossy 3D, stock-photo aesthetics, anime styling, bright pastels, neon cyberpunk, racing crowds, vehicles, cliffs that feel threatening, clutter in the bottom third, floating objects, duplicated bicycle parts, extra limbs, duplicated figures, or multiple scenes.

#### cycle-city-commute

- Source: /Users/johansardar/ExcerLock/excer-ui-mock/assets/banners/cycle-city-commute-source.png
- Source SHA-256: 83bd55eea5b64bce495765e9d8990c0dfed6dcf8911fa8fabb4f625d62c7a0ae
- Source dimensions: 1862 × 845 px, RGB, opaque.
- Production: /Users/johansardar/ExcerLock/excer-ui-mock/assets/banners/cycle-city-commute.png
- Center crop box: (0, 0)–(1862, 844), yielding 1862 × 844 before resize.
- Final dimensions: 1536 × 696 px, RGB, opaque.
- SHA-256: a201c538c3f85e301632bab92072704faf078a18bf02e9b2bbe1d9555a6ba36b
- Lower-third luminance: 11.84 versus 33.10 for the upper two-thirds.
- Reference: /Users/johansardar/ExcerLock/prototype/assets/icons/gym-card.png
- Acceptance: **Accepted.** Protected city bike lane, warm brick/window rhythm, and exactly one cyclist riding away. Helmet and rear angle show no face; the street is intentionally free of vehicles, pedestrians, signage, logos, and text. The lower third remains dark and spatially simple.

Exact prompt:

    Use case: stylized-concept
    Asset type: ExcerLock Family C condition banner.

    Input image: Image 1 is the strict style reference for rendering language, painterly graphic linework, faceted shapes, cinematic lighting, warm-dark color treatment, texture, and finish. Preserve that exact visual family, but do not reproduce its gym subject or objects.

    Primary request: Create a city cycling commute scene at warm dusk: a protected urban bike lane running between dark brick buildings and a row of street trees, with amber window light and one small cyclist traveling away from the viewer in the upper-middle distance. The rider must be shown strictly from behind, wearing a simple dark helmet and unbranded clothing, with no face or facial detail visible. Keep the street unusually quiet, with no pedestrians and no vehicles.

    Style and medium: Match the reference image closely in the same Spider-Verse-inspired stylized animation style—graphic painterly shapes, confident illustrated edges, subtle halftone-like texture, dramatic warm highlights, deep cool shadows, and a premium cinematic animation-frame finish.

    Composition and framing: An extremely wide 2.21:1 landscape banner, one coherent continuous scene. Use the bike lane and building edges as strong leading lines toward the small rear-view cyclist and warm distance. Keep the cyclist and important city detail in the upper and middle two-thirds. Leave the entire bottom third deliberately calm, darker, low-contrast, and low-detail so a dark scrim and white UI copy can sit over it. Maintain crop-safe space across the width.

    Lighting and mood: Warm dark palette; burnt orange, amber windows, rust brick, charcoal, midnight navy, and muted deep blue shadows. Purposeful, smooth, calm, physical, and rewarding—never hectic or dangerous.

    Hard constraints: No visible faces anywhere; the cyclist is seen only from behind and the helmet fully obscures the head and face. No text, typography, numbers, UI, logo, signature, watermark, readable signage, street names, advertisements, license plates, brand marks, collage, split panels, border, or frame. Exactly one cyclist. No other people. No vehicles. One coherent environment. Fully opaque image.

    Avoid: photorealism, glossy 3D, stock-photo aesthetics, anime styling, bright pastels, neon cyberpunk, traffic, crowds, clutter in the bottom third, floating objects, duplicated bicycle parts, extra limbs, duplicated figures, or multiple scenes.

#### swim-pool-lanes

- Source: /Users/johansardar/ExcerLock/excer-ui-mock/assets/banners/swim-pool-lanes-source.png
- Source SHA-256: 4c0570da6f003af41e26097d5ba21ed4db00a34e16a64a6c5d338b62af2dcd53
- Source dimensions: 1866 × 843 px, RGB, opaque.
- Production: /Users/johansardar/ExcerLock/excer-ui-mock/assets/banners/swim-pool-lanes.png
- Center crop box: (3, 0)–(1863, 843), yielding 1860 × 843 before resize.
- Final dimensions: 1536 × 696 px, RGB, opaque.
- SHA-256: 4c7d558b42251b80a7c7a23fd4a7d459cdc21c77f409a8606d4c8cf6992fe073
- Lower-third luminance: 10.33 versus 41.79 for the upper two-thirds.
- Reference: /Users/johansardar/ExcerLock/prototype/assets/icons/gym-card.png
- Acceptance: **Accepted.** One empty indoor lap pool with parallel lane lines, deep painted blues, and warm amber window light. No people, faces, lane numbers, clock, signage, typography, logo, or watermark. The near water is dark and low-detail enough for the planned scrim and white copy.

Exact prompt:

    Use case: stylized-concept
    Asset type: ExcerLock Family C condition banner.

    Input image: Image 1 is the strict style reference for rendering language, painterly graphic linework, faceted shapes, cinematic lighting, warm-dark color treatment, texture, and finish. Preserve that exact visual family, but do not reproduce its gym subject or objects.

    Primary request: Create an empty indoor lap-pool scene at quiet early morning: several long swimming lanes receding toward tall dark windows, clean lane ropes without any markings or lettering, deep blue water, subtle underwater caustics, and warm amber sunlight entering from one side. No swimmers and no people anywhere.

    Style and medium: Match the reference image closely in the same Spider-Verse-inspired stylized animation style—graphic painterly shapes, confident illustrated edges, subtle halftone-like texture, dramatic warm highlights, deep cool shadows, and a premium cinematic animation-frame finish.

    Composition and framing: An extremely wide 2.21:1 landscape banner, one coherent continuous scene. Use the pool lanes as strong parallel leading lines into the upper-middle distance. Keep windows, warm highlights, and important architectural detail in the upper and middle two-thirds. Leave the entire bottom third deliberately calm, darker, low-contrast, and low-detail—simple dark water and pool-edge shapes only—so a dark scrim and white UI copy can sit over it. Maintain crop-safe space across the width.

    Lighting and mood: Warm dark palette; amber and burnt-orange window light against midnight navy, charcoal, muted teal, and deep blue water. Quiet, focused, refreshing, physical, and rewarding—never sterile or ominous.

    Hard constraints: No visible faces anywhere. No people or swimmers. No text, typography, numbers, UI, logo, signature, watermark, readable signage, lane numbers, clocks, flags with markings, brand marks, collage, split panels, border, or frame. One coherent environment. Fully opaque image.

    Avoid: photorealism, glossy 3D, stock-photo aesthetics, anime styling, bright pastels, neon cyberpunk, tropical resort styling, racing event equipment, clutter in the bottom third, floating objects, duplicated lane ropes, malformed architecture, or multiple scenes.

#### Batch acceptance

**Accepted: 7 of 7.** Every requested subject has both a preserved model source and a production crop. The set reads as one coherent Family C banner family while each condition remains immediately distinguishable. No shared manifest or application code was edited.

---

## Merged batch C record — seven accepted assets

### ExcerLock Family C banner foundry — batch C

- Date: 2026-08-07
- Status: **7/7 ACCEPTED**
- Generator: Codex built-in `image_gen` (GPT Image 2)
- Execution: one independent built-in call per asset; no CLI fallback; no
  alternate model; no retries or correction edits
- Family: `design/STYLE.md` Family C — Painted banner
- User override: GPT Image 2 replaces STYLE.md's older Higgsfield renderer;
  the Family-C visual contract and anchor remain unchanged
- Shared style reference for every call:
  `/Users/johansardar/ExcerLock/prototype/assets/icons/gym-card.png`
- Reference role: style, brush texture, palette, shape language, and cinematic
  lighting only; never an edit target and never a source crop
- Output directory:
  `/Users/johansardar/ExcerLock/excer-ui-mock/assets/banners/`
- Final contract: center-cropped/resized opaque RGB PNG, exactly 1536×696
  (64:29, approximately 2.21:1), full bleed, no baked rounded corners

The image-generation skill and `design/STYLE.md` were read completely before
the first call. All seven outputs use the same locked Family-C scaffold:
Spider-Verse-inspired stylized animation, painterly comic-film rendering,
visible brush texture, deep navy/indigo shadows with warm orange highlights,
no visible faces, no text/UI/logo/watermark, and a deliberately calm dark
bottom third for a runtime scrim and white overlay copy.

#### Post-processing actually executed

The untouched model output was copied to `<name>-source.png`. Each final was
then produced with the following center-crop/resize expression. `ffmpeg -n`
refused replacement if a destination already existed.

The command retains its historical staging path verbatim. That transient
directory no longer exists; the accepted source/final pairs now live under
`assets/banners/` with the same recorded hashes.

```bash
asset_dir=/Users/johansardar/ExcerLock/excer-ui-mock/assets/foundry/banners

for asset_name in \
  swim-open-water \
  swim-underwater-light \
  general-abstract-energy \
  general-sunrise \
  general-city-motion \
  general-rain-window \
  general-mountain-silhouette
do
  ffmpeg -n -loglevel error \
    -i "$asset_dir/${asset_name}-source.png" \
    -vf "crop=w='if(gt(a,1536/696),ih*1536/696,iw)':h='if(gt(a,1536/696),ih,iw*696/1536)',scale=1536:696:flags=lanczos,format=rgb24" \
    -frames:v 1 "$asset_dir/${asset_name}.png"
done
```

Validation used `file` plus:

```bash
ffprobe -v error -select_streams v:0 \
  -show_entries stream=width,height,pix_fmt \
  -of csv=p=0:s=x <final.png>
```

Every final returned `1536x696xrgb24`. Tesseract `--psm 11` was run as a
heuristic and hallucinated punctuation/letter-like fragments from brush
texture on all seven scenes. Those strings are not treated as a pass/fail
gate. Close visual inspection of every actual final at original resolution
confirmed that none contains readable text, letters, numerals, signage, UI,
logos, or watermarks.

#### Batch validation summary

| Asset | Source dimensions/mode | Final dimensions/mode | Style | Faces/people | Readable text/UI/logo | Calm bottom third | Crop | Result |
|---|---|---|---|---|---|---|---|---|
| `swim-open-water` | 1867×842 RGB | 1536×696 RGB | Pass — inked painterly ocean, orange/indigo anchor palette | Pass — none | Pass | Pass — broad near-black foreground water | Pass — sun, horizon, and buoy preserved | **ACCEPTED** |
| `swim-underwater-light` | 1862×845 RGB | 1536×696 RGB | Pass — comic-film surface texture and warm shafts | Pass — none | Pass | Pass — deep featureless water | Pass — surface and beams preserved | **ACCEPTED** |
| `general-abstract-energy` | 1868×842 RGB | 1536×696 RGB | Pass — visible brush ribbons, confident orange/navy massing | Pass — none | Pass | Pass — ribbons taper into near-black field | Pass — continuous current preserved | **ACCEPTED** |
| `general-sunrise` | 1863×844 RGB | 1536×696 RGB | Pass — layered painterly sky and indigo fields | Pass — none | Pass | Pass — one broad shadowed field | Pass — sun and ridge rhythm preserved | **ACCEPTED** |
| `general-city-motion` | 1864×844 RGB | 1536×696 RGB | Pass — simplified inked city and orange motion trails | Pass — none; no readable vehicles | Pass — windows are abstract blocks only | Pass — empty dark asphalt | Pass — vanishing point and trails preserved | **ACCEPTED** |
| `general-rain-window` | 1863×844 RGB | 1536×696 RGB | Pass — painterly rivulets and warm bokeh on indigo glass | Pass — none | Pass | Pass — glass falls into dark low-detail shadow | Pass — main bokeh/rain field preserved | **ACCEPTED** |
| `general-mountain-silhouette` | 1867×842 RGB | 1536×696 RGB | Pass — layered indigo ridges and warm brush sky | Pass — none | Pass | Pass — nearest ridge is one near-black mass | Pass — ridge cadence and sky preserved | **ACCEPTED** |

#### `swim-open-water`

- Status: **ACCEPTED — attempt 1**
- Model output:
  `/Users/johansardar/.codex/generated_images/019fdd4a-d551-7320-a4ea-b38a9234eff6/exec-31640c1f-f7d5-4f8f-9837-5f12c76e7c62.png`
- Persisted source:
  `/Users/johansardar/ExcerLock/excer-ui-mock/assets/banners/swim-open-water-source.png`
- Source: 1867×842 RGB
- Final:
  `/Users/johansardar/ExcerLock/excer-ui-mock/assets/banners/swim-open-water.png`
- Final: 1536×696 RGB
- Reference:
  `/Users/johansardar/ExcerLock/prototype/assets/icons/gym-card.png`
- Source SHA-256:
  `26765d9f85886e498a96d5781de81f2cd5014017ec295f38ae6fe58acae65bfd`
- Final SHA-256:
  `a74ece117614bfef569881d3b5daebdb8b152c48b6f329ec64167fd4c4033350`
- Acceptance: the round buoy is small and remains above the overlay zone; no
  people or boats; orange sunrise and rim-lit waves match the anchor palette;
  the lower third is broad near-black water with ample white-copy contrast.

##### Verbatim prompt

```text
Use case: stylized-concept
Asset type: ExcerLock Family C condition-card banner, SWIM — OPEN WATER; final use is a full-bleed 2.21:1 wide iOS card banner.
Input images: Image 1 is the strict style reference only. Match its Spider-Verse-inspired stylized animation language, painterly comic-film rendering, visible brush texture, confident inked simplified shapes, warm-dark palette, and moody cinematic lighting. Do not copy its gym subject or composition.
Primary request: Create one coherent scene of calm open water at sunrise. A low blazing warm-orange sun sits just above the horizon and lays one shimmering light path across gentle swells; one small round marker buoy floats in the middle distance. Deep indigo water fills the rest of the scene.
Composition/framing: true ultra-wide cinematic 2.21:1 composition inside the landscape canvas, full bleed, protected for a centered 2.21:1 crop. Horizon in the upper third. Keep the entire bottom third calm, very dark, low-detail water so a dark scrim plus white title, subtitle, status chip, and CTA remain legible. Keep the buoy above the bottom overlay zone.
Lighting/mood: quiet, rewarding sunrise; glowing orange highlights and rim light against deep navy and indigo shadows.
Constraints: no people, swimmers, faces, boats, animals, buildings, or extra objects. No visible face anywhere. No text, letters, numerals, signage, UI, logo, app mark, border, rounded corners, frame, or watermark. No photorealism. No magenta backdrop and no transparency. One coherent scene only.
```

#### `swim-underwater-light`

- Status: **ACCEPTED — attempt 1**
- Model output:
  `/Users/johansardar/.codex/generated_images/019fdd4a-d551-7320-a4ea-b38a9234eff6/exec-dd2c294d-c043-423d-afd5-c46cd52bb0f4.png`
- Persisted source:
  `/Users/johansardar/ExcerLock/excer-ui-mock/assets/banners/swim-underwater-light-source.png`
- Source: 1862×845 RGB
- Final:
  `/Users/johansardar/ExcerLock/excer-ui-mock/assets/banners/swim-underwater-light.png`
- Final: 1536×696 RGB
- Reference:
  `/Users/johansardar/ExcerLock/prototype/assets/icons/gym-card.png`
- Source SHA-256:
  `de319cd64c82ac4270a6d8c2f487b4aa17011f1362b516a61f8f43a5bbf26e3c`
- Final SHA-256:
  `0b2f32d737299cef49149e480244f924b1614982262c24e25e363dfa0cbcc253`
- Acceptance: one coherent underwater field, no swimmer/architecture, strong
  brushy surface, restrained bubbles, and a clean dark lower register.

##### Verbatim prompt

```text
Use case: stylized-concept
Asset type: ExcerLock Family C condition-card banner, SWIM — UNDERWATER LIGHT; final use is a full-bleed 2.21:1 wide iOS card banner.
Input images: Image 1 is the strict style reference only. Match its Spider-Verse-inspired stylized animation language, painterly comic-film rendering, visible brush texture, confident inked simplified shapes, warm-dark palette, and moody cinematic lighting. Do not copy its gym subject or composition.
Primary request: Create one coherent underwater scene looking upward through a deep pool. Broad shafts of warm orange-gold light pierce down through the rippling surface, with a few delicate streams of small bubbles rising. Water transitions from glowing amber near the upper surface to deep indigo and navy below.
Composition/framing: true ultra-wide cinematic 2.21:1 composition inside the landscape canvas, full bleed, protected for a centered 2.21:1 crop. Keep the light shafts and surface in the upper half. Keep the entire bottom third calm, very dark, low-detail deep water so a dark scrim plus white title, subtitle, status chip, and CTA remain legible.
Lighting/mood: quiet submerged wonder, rewarding rather than ominous; orange-gold beams against deep navy and indigo shadow.
Constraints: no people, swimmers, faces, animals, pool furniture, architecture, or extra objects. No visible face anywhere. No text, letters, numerals, signage, UI, logo, app mark, border, rounded corners, frame, or watermark. No photorealism. No magenta backdrop and no transparency. One coherent scene only.
```

#### `general-abstract-energy`

- Status: **ACCEPTED — attempt 1**
- Model output:
  `/Users/johansardar/.codex/generated_images/019fdd4a-d551-7320-a4ea-b38a9234eff6/exec-329143a6-f9d4-496b-9b5f-a9d05e8cbaaf.png`
- Persisted source:
  `/Users/johansardar/ExcerLock/excer-ui-mock/assets/banners/general-abstract-energy-source.png`
- Source: 1868×842 RGB
- Final:
  `/Users/johansardar/ExcerLock/excer-ui-mock/assets/banners/general-abstract-energy.png`
- Final: 1536×696 RGB
- Reference:
  `/Users/johansardar/ExcerLock/prototype/assets/icons/gym-card.png`
- Source SHA-256:
  `f8c5279345ef39eec472d2fbf3b908883b924c01c52d75af5182a325d5cb340c`
- Final SHA-256:
  `d1619e2c1a4af8954c54e23a69b550331277a309d76a849d4a8530185088316e`
- Acceptance: the ribbons form one continuous current rather than unrelated
  objects; no accidental symbol; broad black/navy lower field remains clear.

##### Verbatim prompt

```text
Use case: stylized-concept
Asset type: ExcerLock Family C condition-card banner, GENERAL — ABSTRACT ENERGY; final use is a full-bleed 2.21:1 wide iOS card banner.
Input images: Image 1 is the strict style reference only. Match its Spider-Verse-inspired stylized animation language, painterly comic-film rendering, visible brush texture, confident inked simplified shapes, warm-dark palette, and moody cinematic lighting. Do not copy its gym subject or composition.
Primary request: Create one coherent purely abstract scene of powerful forward motion: several broad sweeping ribbons of glowing warm-orange light arc and stream across a deep indigo-navy field, with restrained ember flecks and a few confident comic-film speed strokes. The ribbons should feel like one continuous current, not disconnected objects.
Composition/framing: true ultra-wide cinematic 2.21:1 composition inside the landscape canvas, full bleed, protected for a centered 2.21:1 crop. Concentrate the brightest ribbon movement through the upper and middle bands. Let all motion taper into calm deep indigo; keep the entire bottom third very dark, low-detail, and mostly empty so a dark scrim plus white title, subtitle, status chip, and CTA remain legible.
Lighting/mood: energetic, warm, rewarding, and premium; bright orange cores with subtle red-orange edges against navy and indigo shadow.
Constraints: purely abstract; no people, faces, animals, recognizable objects, landscapes, buildings, or symbols. No visible face anywhere. No text, letters, numerals, signage, UI, logo, app mark, border, rounded corners, frame, or watermark. No photorealism. No magenta backdrop and no transparency. One coherent scene only.
```

#### `general-sunrise`

- Status: **ACCEPTED — attempt 1**
- Model output:
  `/Users/johansardar/.codex/generated_images/019fdd4a-d551-7320-a4ea-b38a9234eff6/exec-d54efa64-a3d7-43eb-85e6-242bcd596cee.png`
- Persisted source:
  `/Users/johansardar/ExcerLock/excer-ui-mock/assets/banners/general-sunrise-source.png`
- Source: 1863×844 RGB
- Final:
  `/Users/johansardar/ExcerLock/excer-ui-mock/assets/banners/general-sunrise.png`
- Final: 1536×696 RGB
- Reference:
  `/Users/johansardar/ExcerLock/prototype/assets/icons/gym-card.png`
- Source SHA-256:
  `7c91ed07d3cf2056138023b392e392cbbe885e447ed7467121648adb722bcdb0`
- Final SHA-256:
  `3e2164323838bd1ecb7c534c1c80795ceb6177540d67776503456346624e70b7`
- Acceptance: the center crop retains the sun and layered ridge rhythm; no
  people/buildings; the lower field is dark enough for both overlay corners.

##### Verbatim prompt

```text
Use case: stylized-concept
Asset type: ExcerLock Family C condition-card banner, GENERAL — SUNRISE; final use is a full-bleed 2.21:1 wide iOS card banner.
Input images: Image 1 is the strict style reference only. Match its Spider-Verse-inspired stylized animation language, painterly comic-film rendering, visible brush texture, confident inked simplified shapes, warm-dark palette, and moody cinematic lighting. Do not copy its gym subject or composition.
Primary request: Create one coherent landscape of a blazing sunrise breaking over a low horizon of rolling hills. The sky is built from layered painterly bands of orange and amber, with a few thin dark clouds catching fire along their edges. Foreground fields remain deep indigo in pre-dawn shadow.
Composition/framing: true ultra-wide cinematic 2.21:1 composition inside the landscape canvas, full bleed, protected for a centered 2.21:1 crop. Place the glowing horizon in the upper third and keep all ridge detail above the lower overlay zone. Make the nearest field one broad calm, dark, low-detail mass across the entire bottom third so a dark scrim plus white title, subtitle, status chip, and CTA remain legible.
Lighting/mood: hopeful first light, warm and rewarding; bright orange horizon against layered navy and indigo land.
Constraints: no people, faces, animals, buildings, vehicles, roads, signs, or extra objects. No visible face anywhere. No text, letters, numerals, signage, UI, logo, app mark, border, rounded corners, frame, or watermark. No photorealism. No magenta backdrop and no transparency. One coherent scene only.
```

#### `general-city-motion`

- Status: **ACCEPTED — attempt 1**
- Model output:
  `/Users/johansardar/.codex/generated_images/019fdd4a-d551-7320-a4ea-b38a9234eff6/exec-d05a871a-ef01-4226-911f-6d655a54b83c.png`
- Persisted source:
  `/Users/johansardar/ExcerLock/excer-ui-mock/assets/banners/general-city-motion-source.png`
- Source: 1864×844 RGB
- Final:
  `/Users/johansardar/ExcerLock/excer-ui-mock/assets/banners/general-city-motion.png`
- Final: 1536×696 RGB
- Reference:
  `/Users/johansardar/ExcerLock/prototype/assets/icons/gym-card.png`
- Source SHA-256:
  `edb2439f7a8740041974a9b96404e6247733a3374ad4e42c1c80c188a598a548`
- Final SHA-256:
  `239eaa22e4d5d4484da30507faa0e00915f22bfe1a11a0ee013886aaeb456cf2`
- Acceptance: coherent avenue and vanishing point; no people or readable
  vehicles/signage; the bright path remains above the dark asphalt text zone.

##### Verbatim prompt

```text
Use case: stylized-concept
Asset type: ExcerLock Family C condition-card banner, GENERAL — CITY MOTION; final use is a full-bleed 2.21:1 wide iOS card banner.
Input images: Image 1 is the strict style reference only. Match its Spider-Verse-inspired stylized animation language, painterly comic-film rendering, visible brush texture, confident inked simplified shapes, warm-dark palette, and moody cinematic lighting. Do not copy its gym subject or composition.
Primary request: Create one coherent night city avenue alive with motion. Long warm-orange traffic light trails sweep in one clear direction between dark simplified building silhouettes; restrained comic-film motion streaks reinforce forward movement. A few windows glow as abstract rectangles beneath a deep indigo sky. Vehicles are not individually readable.
Composition/framing: true ultra-wide cinematic 2.21:1 composition inside the landscape canvas, full bleed, protected for a centered 2.21:1 crop. Keep the skyline and brightest light trails in the upper and middle bands. Keep the entire bottom third as calm, very dark, low-detail empty asphalt so a dark scrim plus white title, subtitle, status chip, and CTA remain legible.
Lighting/mood: kinetic but controlled; orange light paths against deep navy and indigo shadows, premium and cinematic rather than chaotic.
Constraints: no people or faces; no readable vehicles; no storefront lettering or signs. No visible face anywhere. No text, letters, numerals, signage, UI, logo, app mark, border, rounded corners, frame, or watermark. No photorealism. No magenta backdrop and no transparency. One coherent scene only.
```

#### `general-rain-window`

- Status: **ACCEPTED — attempt 1**
- Model output:
  `/Users/johansardar/.codex/generated_images/019fdd4a-d551-7320-a4ea-b38a9234eff6/exec-b9ddbc6f-c7e5-4f4a-be8a-55581f891b67.png`
- Persisted source:
  `/Users/johansardar/ExcerLock/excer-ui-mock/assets/banners/general-rain-window-source.png`
- Source: 1863×844 RGB
- Final:
  `/Users/johansardar/ExcerLock/excer-ui-mock/assets/banners/general-rain-window.png`
- Final: 1536×696 RGB
- Reference:
  `/Users/johansardar/ExcerLock/prototype/assets/icons/gym-card.png`
- Source SHA-256:
  `e28cc9c9a3d33265fa1ea7afea23b0ed1a173b8f1ed08c9075845cf0c8ba7915`
- Final SHA-256:
  `65083370d43e3ecf4e3b4c9d94564bd67722ecbae9a8a0f6476dee66e5aec814`
- Acceptance: close inspection shows painterly rivulets and bokeh only—no
  accidental faces, characters, lettering, or frame; lower glass is quiet.

##### Verbatim prompt

```text
Use case: stylized-concept
Asset type: ExcerLock Family C condition-card banner, GENERAL — RAIN WINDOW; final use is a full-bleed 2.21:1 wide iOS card banner.
Input images: Image 1 is the strict style reference only. Match its Spider-Verse-inspired stylized animation language, painterly comic-film rendering, visible brush texture, confident inked simplified shapes, warm-dark palette, and moody cinematic lighting. Do not copy its gym subject or composition.
Primary request: Create one coherent close view of rain streaking down a dark window pane at night. Warm-orange city lights beyond the glass dissolve into soft painterly bokeh, while a restrained set of droplets and thin rivulets catch the glow against deep indigo darkness.
Composition/framing: true ultra-wide cinematic 2.21:1 composition inside the landscape canvas, full bleed, protected for a centered 2.21:1 crop. Concentrate brighter bokeh and rain detail in the upper and middle bands. Let the glass fade into calm deep-indigo shadow; keep the entire bottom third very dark and low-detail so a dark scrim plus white title, subtitle, status chip, and CTA remain legible.
Lighting/mood: intimate rainy-night calm, warm and contemplative rather than sad or threatening; orange bokeh against navy and indigo glass.
Constraints: no people, faces, silhouettes, readable street scene, objects in focus, or window frame. No visible face anywhere. No text, letters, numerals, signage, UI, logo, app mark, border, rounded corners, frame, or watermark. No photorealism. No magenta backdrop and no transparency. One coherent scene only.
```

#### `general-mountain-silhouette`

- Status: **ACCEPTED — attempt 1**
- Model output:
  `/Users/johansardar/.codex/generated_images/019fdd4a-d551-7320-a4ea-b38a9234eff6/exec-a90147f4-b28a-4cc4-99ac-a1aa482b8d90.png`
- Persisted source:
  `/Users/johansardar/ExcerLock/excer-ui-mock/assets/banners/general-mountain-silhouette-source.png`
- Source: 1867×842 RGB
- Final:
  `/Users/johansardar/ExcerLock/excer-ui-mock/assets/banners/general-mountain-silhouette.png`
- Final: 1536×696 RGB
- Reference:
  `/Users/johansardar/ExcerLock/prototype/assets/icons/gym-card.png`
- Source SHA-256:
  `3cdb932f9923b985bf9ca7dba413693fc69c3cfc4bd57705644546f13d87d86f`
- Final SHA-256:
  `cde8ecb3b4a798eb82f298899c371e5d983009ca7c84ec1b0c0b74b25e70a003`
- Acceptance: centered crop keeps all major ridge layers; no extra objects;
  nearest ridge forms a continuous near-black overlay surface.

##### Verbatim prompt

```text
Use case: stylized-concept
Asset type: ExcerLock Family C condition-card banner, GENERAL — MOUNTAIN SILHOUETTE; final use is a full-bleed 2.21:1 wide iOS card banner.
Input images: Image 1 is the strict style reference only. Match its Spider-Verse-inspired stylized animation language, painterly comic-film rendering, visible brush texture, confident inked simplified shapes, warm-dark palette, and moody cinematic lighting. Do not copy its gym subject or composition.
Primary request: Create one coherent dusk landscape of layered mountain ridges in silhouette. Each receding ridge becomes a softer shade of deep indigo; faint mist separates the layers. Behind the peaks, the sky glows in broad warm-orange and amber bands with only a few thin dark clouds.
Composition/framing: true ultra-wide cinematic 2.21:1 composition inside the landscape canvas, full bleed, protected for a centered 2.21:1 crop. Keep the layered ridgeline rhythm through the upper and middle bands. Make the nearest ridge one continuous calm, near-black, low-detail mass across the entire bottom third so a dark scrim plus white title, subtitle, status chip, and CTA remain legible.
Lighting/mood: expansive, calm, earned, and quietly triumphant; orange dusk behind deep navy and indigo silhouettes.
Constraints: no people, faces, animals, trees in close-up, buildings, roads, signs, or extra objects. No visible face anywhere. No text, letters, numerals, signage, UI, logo, app mark, border, rounded corners, frame, or watermark. No photorealism. No magenta backdrop and no transparency. One coherent scene only.
```

#### Disposition

All seven source/final pairs are accepted in the standalone banner foundry and
are now part of this consolidated runtime manifest.
