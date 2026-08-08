# ExcerLock standalone hero foundry

This is the complete standalone Family A manifest for excer-ui-mock. It covers the two byte-for-byte canonical lock copies and the six new GPT Image 2 heroes generated for the standalone app.

Generated assets follow design/STYLE.md Family A: soft matte ivory clay, soft light-gray shading, rounded volume, no gloss or metal, and a flat #FF00FF foundry background removed locally. Opaque sources deliberately retain the magenta background and are not validator targets.

## Production and validation policy

- Original renderer: Codex built-in image_gen.
- Model: GPT Image 2.
- Family: A — soft-clay hero.
- New-asset template: the exact Family A template in work/excer-ui-mock-asset-plan.md, expanded only at NAME, SUBJECT, and SIZE.
- New-asset raw outputs: 1254 × 1254 RGB files under the exact generated-output paths recorded below.
- New-asset normalization: sips --resampleHeightWidth 1024 1024 RAW --out OPAQUE.
- Keying: python3 prototype/scripts/remove_chroma_key.py OPAQUE FINAL --edge-contract 1 --despill.
- Validator target: keyed finals only. The *-opaque.png files intentionally contain #FF00FF and were not passed to validate_icons.py.
- Final validator: python3 prototype/scripts/validate_icons.py, run across all eight keyed runtime finals.
- Display review: each hero was composited on the production orange gradient #F98529 → #EB2E02 over a dark #301D12 card at its intended point size and again at a 96 pt stress size. Review used a @2x raster proxy.
- Review gates: clear silhouette; Family A material and weight; no magenta box/fringe; no unintended dark hole, gloss, detached piece, baked shadow, text, logo, or watermark.
- Acceptance: 8 of 8 accepted. No rejected or superseded attempt ships in this directory.

## Full validation metrics

All rows have size_pass, corners_pass, and residual_pass equal to true; the reported final mode is RGBA for every row.

| Runtime final | Mode | Size | Corner alpha | Residual chroma pixels | Visible pixels | Visible coverage | Visible bbox |
|---|---|---|---|---:|---:|---:|---|
| lock-body.png | RGBA | 1024 × 1024 | 0, 0, 0, 0 | 0 | 583,782 | 0.556738 | [102, 147, 922, 885] |
| lock-shackle.png | RGBA | 1024 × 1024 | 0, 0, 0, 0 | 0 | 269,882 | 0.257380 | [146, 99, 878, 891] |
| permission-screen-time.png | RGBA | 1024 × 1024 | 0, 0, 0, 0 | 0 | 459,774 | 0.438475 | [138, 112, 886, 923] |
| permission-health-motion.png | RGBA | 1024 × 1024 | 0, 0, 0, 0 | 0 | 422,896 | 0.403305 | [113, 155, 917, 874] |
| permission-location.png | RGBA | 1024 × 1024 | 0, 0, 0, 0 | 0 | 354,326 | 0.337912 | [207, 104, 816, 912] |
| allowance-clock.png | RGBA | 1024 × 1024 | 0, 0, 0, 0 | 0 | 503,984 | 0.480637 | [111, 112, 910, 916] |
| paywall-hero.png | RGBA | 1024 × 1024 | 0, 0, 0, 0 | 0 | 296,915 | 0.283160 | [190, 125, 824, 901] |
| empty-conditions.png | RGBA | 1024 × 1024 | 0, 0, 0, 0 | 0 | 503,046 | 0.479742 | [149, 151, 870, 873] |

Residual chroma uses the validator predicate alpha > 0 AND R > G + 60 AND B > G + 60.

## Checksums

| Asset | Opaque SHA-256 | Final SHA-256 | Raw ImageGen SHA-256 |
|---|---|---|---|
| lock-body | 005e1e1cc7c5496ed75431406e93dcb896f00b4b1100361dc9fdae9f4334a878 | 75d74d53afcf6c584dac13258a5fb19f835abca07b7cbe381ff3b0ce4507c823 | Legacy cache identifier not retained; canonical prototype opaque is the recorded generated output |
| lock-shackle | 4424e61af139cbcd05e12f8353fae19ed746525e3128689dc82ced273721dfe7 | 559f82525e23953c3e3017cc9fb6941b073f72b1b86c0c31fb47fb69d411a713 | Legacy cache identifier not retained; canonical prototype opaque is the recorded generated output |
| permission-screen-time | 9f4cf9d859c9643e6885ff480a9fa69f76105820a2758bb292af68037b2206d9 | 60ee74002a3a92a13303d08c1f4daab448f741a0408a8844c38a5a57e46cef73 | 1b11e7df844c18693983993ec64262b50e9f5a0a83c2fc6be4e2b5bf956cd24c |
| permission-health-motion | 03a0fa31a406353fb396795adbcd5a596524ec61298ce719bc888e1aadc644b2 | b327933b30ce2ed3fb48f6aeb9dacee74c7d7a05a14852faa887d94468d898b2 | b46998940e3e631e7d1d1f4790f463c09ec34ea0247d42f91b06b56fa8882d38 |
| permission-location | d112cfa4cc933c92850a9527491602f5ee96c6a6268e0bb86009723f38b2fdca | 0596b66239dd3668ae0e88a68a35eb5dbd308aa132b590247133f4df231a3f26 | 5d8e9ff7fae1a569322ecef8f6aa8d8590538dd9d070049d8243b4178443a640 |
| allowance-clock | 62b39aa66327112aca4a83861e91f9ca52da7c328bf9ff304c1e22863e33c423 | c957b76525930fb0f435dbb51252eaa25bc33b9af7fe3648efea03bed3fff3ed | f36a47a0b1718951950cef0b5d5ffc1adf84d05c77faa1b187b3d73255dcd435 |
| paywall-hero | 64bc2a9b11864d0258c945c6ef9a6a16a4a430d60e07939adc2affb68d88c2bf | 01ea2ede935e4a01b7ded836d4ec83c3381f0609d6380a49960ce6796d3d9490 | 7dac4e4df8f6332c6c0875042ffdc3a1ed0ae2d9db835237b968c1e7aa874f05 |
| empty-conditions | 46c88fc3a8e248e679e79439df6a3470679f3eadea4101d43c3bb802e038fcf0 | af2fd11e6f03c1ae8d273e8f92bc4503f9ea5b69287db0312aee7e6dd5d6ac21 | d20791f6c8c1b122aed3f9d011a616f1426064ff1e153d0c447ce71eef540557 |

## lock-body

- asset_id: lock-body
- status: ACCEPTED
- family: A
- runtime_final: excer-ui-mock/assets/heroes/lock-body.png
- opaque_or_source: excer-ui-mock/assets/heroes/lock-body-opaque.png
- generator / model: Codex built-in image_gen / GPT Image 2, originally generated 2026-07-27.
- standalone method: byte-for-byte reuse of the accepted canonical GPT Image 2 asset.
- canonical source final: prototype/assets/icons/lock-body.png
- canonical source opaque: prototype/assets/icons/lock-body-opaque.png
- source manifest: prototype/assets/icons/FOUNDRY.md
- use_case: reuse; original generation use case new-asset-with-style-reference.
- template: Family A canonical lock-body prompt.
- reference_images: prototype/assets/icons/lock-reference.png — strict padlock identity and style reference, cropped from the approved dashboard anchor.
- generated_output: prototype/assets/icons/lock-body-opaque.png. The legacy source manifest did not retain the original generated-images cache identifier.
- postprocess/reuse: the canonical generated opaque was normalized to 1024 × 1024, keyed with edge-contract 1 and despill, and validated in the source foundry; both its opaque and final were then copied byte-for-byte into the standalone directory. Source and destination SHA-256 values match.
- dimensions_mode: opaque 1024 × 1024 RGB; final 1024 × 1024 RGBA.
- validation: corner alpha [0,0,0,0]; residual chroma 0; visible pixels 583,782; coverage 0.556738; bbox [102,147,922,885].
- display_checks: accepted at 130 pt and at 96 pt stress size on the production gradient. Rounded ivory body, recessed light-gray keyhole, subtle shackle sockets, and soft volume remain clear; no shackle, magenta fringe, gloss, hard shadow, or dark hole.
- screen_consumers: onboarding sell/done moments, Home lock states, time-out and blocked-app moments.
- attempt / supersedes: accepted canonical attempt / none.
- rejection_reason: N/A.
- reviewer_date: Codex, 2026-08-07 standalone verification.

Verbatim original prompt from prototype/assets/icons/FOUNDRY.md:

    Use case: new-asset-with-style-reference
    Asset type: 1024 × 1024 ExcerLock iOS hero illustration: LOCK BODY.
    Input images: Image 1 is the strict identity and style reference; match its padlock body exactly. Use only the rounded body and its recessed keyhole identity; do not copy the orange backdrop or the shackle.
    Primary request: Create one single centered padlock BODY alone from the reference — rounded-square ivory clay body with recessed light-gray keyhole, no shackle, top edge showing the two subtle shackle sockets. The subject must read instantly at 130 pt display size.
    Scene/backdrop: perfectly flat, uniform solid magenta #FF00FF filling every background pixel to every corner, solely for chroma-key removal. No gradient, texture, shadow, glow, vignette, floor, reflection, particles, or lighting variation in the background.
    Style/medium: soft matte 3D clay-like render; ivory white #F4F1F5 surfaces with soft neutral light-gray shading (#C9C4CC) and gentle rounded volume; recessed details are shaded soft light gray, never dark holes; no gloss, no metal, no hard shadows.
    Color palette: ivory white #F4F1F5 and soft neutral light-gray #C9C4CC only in the subject. Do not use cyan, blue, teal, pink, gold, red, gray outside the listed light-gray, black, orange, or magenta in the subject.
    Composition/framing: one centered subject with generous even padding; every subject pixel well separated from all four edges; strong readable silhouette at 130 pt.
    Constraints: the subject must be opaque and confidently solid-filled, not hollow wire art and not merely thickened outlines. Crisp clean outer edge for chroma keying. The body is front-facing and symmetrical. No shackle. No outer halo, bloom, cast shadow, energy field, black box, text, UI, frame, face, character, logo, or watermark. One subject only.

## lock-shackle

- asset_id: lock-shackle
- status: ACCEPTED
- family: A
- runtime_final: excer-ui-mock/assets/heroes/lock-shackle.png
- opaque_or_source: excer-ui-mock/assets/heroes/lock-shackle-opaque.png
- generator / model: Codex built-in image_gen / GPT Image 2, originally generated 2026-07-27.
- standalone method: byte-for-byte reuse of the accepted canonical GPT Image 2 asset.
- canonical source final: prototype/assets/icons/lock-shackle.png
- canonical source opaque: prototype/assets/icons/lock-shackle-opaque.png
- source manifest: prototype/assets/icons/FOUNDRY.md
- use_case: reuse; original generation use case new-asset-with-style-reference.
- template: Family A canonical lock-shackle prompt.
- reference_images: prototype/assets/icons/lock-reference.png — strict padlock identity and style reference, cropped from the approved dashboard anchor.
- generated_output: prototype/assets/icons/lock-shackle-opaque.png. The legacy source manifest did not retain the original generated-images cache identifier.
- postprocess/reuse: the canonical generated opaque was normalized to 1024 × 1024, keyed with edge-contract 1 and despill, and validated in the source foundry; both its opaque and final were then copied byte-for-byte into the standalone directory. Source and destination SHA-256 values match.
- dimensions_mode: opaque 1024 × 1024 RGB; final 1024 × 1024 RGBA.
- validation: corner alpha [0,0,0,0]; residual chroma 0; visible pixels 269,882; coverage 0.257380; bbox [146,99,878,891].
- display_checks: accepted at 110 pt and at 96 pt stress size on the production gradient. The thick ivory U, open center, rounded legs, and soft shading remain clear; no body, keyhole, magenta fringe, gloss, hard shadow, or dark hole.
- screen_consumers: layered lock animation for onboarding, Home locked/unlocked states, time-out and blocked-app moments.
- attempt / supersedes: accepted canonical attempt / none.
- rejection_reason: N/A.
- reviewer_date: Codex, 2026-08-07 standalone verification.

Verbatim original prompt from prototype/assets/icons/FOUNDRY.md:

    Use case: new-asset-with-style-reference
    Asset type: 1024 × 1024 ExcerLock iOS hero illustration: LOCK SHACKLE.
    Input images: Image 1 is the strict identity and style reference; match its shackle thickness, rounded shape, ivory material, and soft shading exactly. Use only the U-shaped shackle identity; do not copy the orange backdrop, body, or keyhole.
    Primary request: Create one single centered padlock SHACKLE alone from the reference — one thick rounded ivory U-shaped shackle, upright, both legs at the bottom, front-facing, with a fully open center. The subject must read instantly at 110 pt display size.
    Scene/backdrop: perfectly flat, uniform solid magenta #FF00FF filling every background pixel to every corner, solely for chroma-key removal. No gradient, texture, shadow, glow, vignette, floor, reflection, particles, or lighting variation in the background.
    Style/medium: soft matte 3D clay-like render; ivory white #F4F1F5 surfaces with soft neutral light-gray shading (#C9C4CC) and gentle rounded volume; recessed details are shaded soft light gray, never dark holes; no gloss, no metal, no hard shadows.
    Color palette: ivory white #F4F1F5 and soft neutral light-gray #C9C4CC only in the subject. Do not use cyan, blue, teal, pink, gold, red, gray outside the listed light-gray, black, orange, or magenta in the subject.
    Composition/framing: one centered subject with generous even padding; every subject pixel well separated from all four edges; strong readable silhouette at 110 pt.
    Constraints: the subject must be opaque and confidently solid-filled, not hollow wire art and not merely thickened outlines. Crisp clean outer edge for chroma keying. No body and no keyhole. No outer halo, bloom, cast shadow, energy field, black box, text, UI, frame, face, character, logo, or watermark. One subject only.

## permission-screen-time

- asset_id: permission-screen-time
- status: ACCEPTED
- family: A
- runtime_final: excer-ui-mock/assets/heroes/permission-screen-time.png
- opaque_or_source: excer-ui-mock/assets/heroes/permission-screen-time-opaque.png
- generator / model: Codex built-in image_gen / GPT Image 2.
- use_case: new-asset-with-style-reference.
- template: Family A canonical from work/excer-ui-mock-asset-plan.md.
- reference_images:
  - prototype/assets/icons/lock-body.png — strict Family A material, softness, shading, edge quality, and visual-weight reference.
  - prototype/assets/icons/lock-shackle.png — strict Family A material, softness, shading, edge quality, and visual-weight reference.
- generated_output: /Users/johansardar/.codex/generated_images/019fdd46-1b43-7971-9abd-588c3b00ec31/exec-bc6216c5-8e8f-49e5-a7d0-d6713ebd6343.png, 1254 × 1254 RGB, SHA-256 1b11e7df844c18693983993ec64262b50e9f5a0a83c2fc6be4e2b5bf956cd24c.
- postprocess:
  - sips --resampleHeightWidth 1024 1024 /Users/johansardar/.codex/generated_images/019fdd46-1b43-7971-9abd-588c3b00ec31/exec-bc6216c5-8e8f-49e5-a7d0-d6713ebd6343.png --out excer-ui-mock/assets/heroes/permission-screen-time-opaque.png
  - python3 prototype/scripts/remove_chroma_key.py excer-ui-mock/assets/heroes/permission-screen-time-opaque.png excer-ui-mock/assets/heroes/permission-screen-time.png --edge-contract 1 --despill
- dimensions_mode: raw 1254 × 1254 RGB; opaque 1024 × 1024 RGB; final 1024 × 1024 RGBA.
- validation: corner alpha [0,0,0,0]; residual chroma 0; visible pixels 459,774; coverage 0.438475; bbox [138,112,886,923].
- display_checks: accepted at 165 pt and at 96 pt stress size. Shield, fused raised padlock, rounded shoulders, and keyhole remain readable; one cohesive object, with no detached piece, dark recess, gloss, baked shadow, box, or fringe.
- screen_consumers: onboarding Screen Time benefit; Settings permission detail.
- sha256: opaque 9f4cf9d859c9643e6885ff480a9fa69f76105820a2758bb292af68037b2206d9; final 60ee74002a3a92a13303d08c1f4daab448f741a0408a8844c38a5a57e46cef73.
- attempt / supersedes: 1 / none.
- rejection_reason: N/A.
- reviewer_date: Codex, 2026-08-07.

Verbatim prompt:

    Use case: new-asset-with-style-reference
    Asset type: 1024 × 1024 ExcerLock iOS hero illustration: PERMISSION SCREEN TIME.
    Input images: The supplied ExcerLock lock image or images are strict material, softness, shading, edge-quality, and visual-weight references. Match that ivory clay identity exactly; do not copy their padlock subject unless the request explicitly asks for a padlock.
    Primary request: Create one single centered cohesive front-facing shield-shaped clay tablet with a small raised closed padlock fused at its center, a broad protective silhouette, deeply rounded corners, and no detached pieces. The subject must read instantly at 165 pt display size.
    Scene/backdrop: perfectly flat, uniform solid magenta #FF00FF filling every background pixel to every corner, solely for chroma-key removal. No gradient, texture, shadow, glow, vignette, floor, reflection, particles, or lighting variation in the background.
    Style/medium: soft matte 3D clay-like render; ivory white #F4F1F5 surfaces with soft neutral light-gray shading (#C9C4CC) and gentle rounded volume; recessed details are shaded soft light gray, never dark holes; no gloss, no metal, no hard shadows.
    Color palette: ivory white #F4F1F5 and soft neutral light-gray #C9C4CC only in the subject. Do not use cyan, blue, teal, pink, gold, red, gray outside the listed light-gray, black, orange, or magenta in the subject.
    Composition/framing: one centered subject occupying roughly 70% of the canvas with generous even padding; every subject pixel well separated from all four edges; strong readable silhouette at 165 pt.
    Constraints: the subject must be opaque and confidently solid-filled, not hollow wire art and not merely thickened outlines. Crisp clean outer edge for chroma keying. Front-facing or gently three-quarter as specified, with no detached accessory. No outer halo, bloom, cast shadow, energy field, black box, text, numerals, UI, frame, face, character, logo, or watermark. One cohesive subject only.

## permission-health-motion

- asset_id: permission-health-motion
- status: ACCEPTED
- family: A
- runtime_final: excer-ui-mock/assets/heroes/permission-health-motion.png
- opaque_or_source: excer-ui-mock/assets/heroes/permission-health-motion-opaque.png
- generator / model: Codex built-in image_gen / GPT Image 2.
- use_case: new-asset-with-style-reference.
- template: Family A canonical from work/excer-ui-mock-asset-plan.md.
- reference_images: prototype/assets/icons/lock-body.png — strict Family A material, softness, shading, edge quality, and visual-weight reference.
- generated_output: /Users/johansardar/.codex/generated_images/019fdd46-1b43-7971-9abd-588c3b00ec31/exec-449b7224-8ef7-4165-a316-de6057de1f9e.png, 1254 × 1254 RGB, SHA-256 b46998940e3e631e7d1d1f4790f463c09ec34ea0247d42f91b06b56fa8882d38.
- postprocess:
  - sips --resampleHeightWidth 1024 1024 /Users/johansardar/.codex/generated_images/019fdd46-1b43-7971-9abd-588c3b00ec31/exec-449b7224-8ef7-4165-a316-de6057de1f9e.png --out excer-ui-mock/assets/heroes/permission-health-motion-opaque.png
  - python3 prototype/scripts/remove_chroma_key.py excer-ui-mock/assets/heroes/permission-health-motion-opaque.png excer-ui-mock/assets/heroes/permission-health-motion.png --edge-contract 1 --despill
- dimensions_mode: raw 1254 × 1254 RGB; opaque 1024 × 1024 RGB; final 1024 × 1024 RGBA.
- validation: corner alpha [0,0,0,0]; residual chroma 0; visible pixels 422,896; coverage 0.403305; bbox [113,155,917,874].
- display_checks: accepted at 165 pt and at 96 pt stress size. Heart medallion, recessed pulse path, and forward resolution remain legible; symmetrical, cohesive, softly shaded, and free of dark holes, detached pieces, gloss, box, or fringe.
- screen_consumers: onboarding Health/Motion benefit; permission explainer detail.
- sha256: opaque 03a0fa31a406353fb396795adbcd5a596524ec61298ce719bc888e1aadc644b2; final b327933b30ce2ed3fb48f6aeb9dacee74c7d7a05a14852faa887d94468d898b2.
- attempt / supersedes: 1 / none.
- rejection_reason: N/A.
- reviewer_date: Codex, 2026-08-07.

Verbatim prompt:

    Use case: new-asset-with-style-reference
    Asset type: 1024 × 1024 ExcerLock iOS hero illustration: PERMISSION HEALTH AND MOTION.
    Input images: The supplied ExcerLock lock image or images are strict material, softness, shading, edge-quality, and visual-weight references. Match that ivory clay identity exactly; do not copy their padlock subject unless the request explicitly asks for a padlock.
    Primary request: Create one single centered cohesive rounded heart-shaped activity medallion with one shallow recessed pulse path that resolves into a single forward step, symmetrical and friendly, with every detail fused into the medallion. The subject must read instantly at 165 pt display size.
    Scene/backdrop: perfectly flat, uniform solid magenta #FF00FF filling every background pixel to every corner, solely for chroma-key removal. No gradient, texture, shadow, glow, vignette, floor, reflection, particles, or lighting variation in the background.
    Style/medium: soft matte 3D clay-like render; ivory white #F4F1F5 surfaces with soft neutral light-gray shading (#C9C4CC) and gentle rounded volume; recessed details are shaded soft light gray, never dark holes; no gloss, no metal, no hard shadows.
    Color palette: ivory white #F4F1F5 and soft neutral light-gray #C9C4CC only in the subject. Do not use cyan, blue, teal, pink, gold, red, gray outside the listed light-gray, black, orange, or magenta in the subject.
    Composition/framing: one centered subject occupying roughly 70% of the canvas with generous even padding; every subject pixel well separated from all four edges; strong readable silhouette at 165 pt.
    Constraints: the subject must be opaque and confidently solid-filled, not hollow wire art and not merely thickened outlines. Crisp clean outer edge for chroma keying. Front-facing or gently three-quarter as specified, with no detached accessory. No outer halo, bloom, cast shadow, energy field, black box, text, numerals, UI, frame, face, character, logo, or watermark. One cohesive subject only.

## permission-location

- asset_id: permission-location
- status: ACCEPTED
- family: A
- runtime_final: excer-ui-mock/assets/heroes/permission-location.png
- opaque_or_source: excer-ui-mock/assets/heroes/permission-location-opaque.png
- generator / model: Codex built-in image_gen / GPT Image 2.
- use_case: new-asset-with-style-reference.
- template: Family A canonical from work/excer-ui-mock-asset-plan.md.
- reference_images: prototype/assets/icons/lock-body.png — strict Family A material, softness, shading, edge quality, and visual-weight reference.
- generated_output: /Users/johansardar/.codex/generated_images/019fdd46-1b43-7971-9abd-588c3b00ec31/exec-0634fbba-b7d0-4b92-a733-b39f9e5e4dea.png, 1254 × 1254 RGB, SHA-256 5d8e9ff7fae1a569322ecef8f6aa8d8590538dd9d070049d8243b4178443a640.
- postprocess:
  - sips --resampleHeightWidth 1024 1024 /Users/johansardar/.codex/generated_images/019fdd46-1b43-7971-9abd-588c3b00ec31/exec-0634fbba-b7d0-4b92-a733-b39f9e5e4dea.png --out excer-ui-mock/assets/heroes/permission-location-opaque.png
  - python3 prototype/scripts/remove_chroma_key.py excer-ui-mock/assets/heroes/permission-location-opaque.png excer-ui-mock/assets/heroes/permission-location.png --edge-contract 1 --despill
- dimensions_mode: raw 1254 × 1254 RGB; opaque 1024 × 1024 RGB; final 1024 × 1024 RGBA.
- validation: corner alpha [0,0,0,0]; residual chroma 0; visible pixels 354,326; coverage 0.337912; bbox [207,104,816,912].
- display_checks: accepted at 155 pt and at 96 pt stress size. Upright pin silhouette and shallow dumbbell recess remain instantly legible; broad, stable, softly shaded, with no dark hole, detached piece, gloss, box, or fringe.
- screen_consumers: onboarding gym/location benefit; gym permission explainer.
- sha256: opaque d112cfa4cc933c92850a9527491602f5ee96c6a6268e0bb86009723f38b2fdca; final 0596b66239dd3668ae0e88a68a35eb5dbd308aa132b590247133f4df231a3f26.
- attempt / supersedes: 1 / none.
- rejection_reason: N/A.
- reviewer_date: Codex, 2026-08-07.

Verbatim prompt:

    Use case: new-asset-with-style-reference
    Asset type: 1024 × 1024 ExcerLock iOS hero illustration: PERMISSION LOCATION.
    Input images: The supplied ExcerLock lock image or images are strict material, softness, shading, edge-quality, and visual-weight references. Match that ivory clay identity exactly; do not copy their padlock subject unless the request explicitly asks for a padlock.
    Primary request: Create one single centered cohesive upright rounded map-pin-shaped clay marker with one shallow dumbbell recess in its circular center, front-facing with a broad stable silhouette. The subject must read instantly at 155 pt display size.
    Scene/backdrop: perfectly flat, uniform solid magenta #FF00FF filling every background pixel to every corner, solely for chroma-key removal. No gradient, texture, shadow, glow, vignette, floor, reflection, particles, or lighting variation in the background.
    Style/medium: soft matte 3D clay-like render; ivory white #F4F1F5 surfaces with soft neutral light-gray shading (#C9C4CC) and gentle rounded volume; recessed details are shaded soft light gray, never dark holes; no gloss, no metal, no hard shadows.
    Color palette: ivory white #F4F1F5 and soft neutral light-gray #C9C4CC only in the subject. Do not use cyan, blue, teal, pink, gold, red, gray outside the listed light-gray, black, orange, or magenta in the subject.
    Composition/framing: one centered subject occupying roughly 70% of the canvas with generous even padding; every subject pixel well separated from all four edges; strong readable silhouette at 155 pt.
    Constraints: the subject must be opaque and confidently solid-filled, not hollow wire art and not merely thickened outlines. Crisp clean outer edge for chroma keying. Front-facing or gently three-quarter as specified, with no detached accessory. No outer halo, bloom, cast shadow, energy field, black box, text, numerals, UI, frame, face, character, logo, or watermark. One cohesive subject only.

## allowance-clock

- asset_id: allowance-clock
- status: ACCEPTED
- family: A
- runtime_final: excer-ui-mock/assets/heroes/allowance-clock.png
- opaque_or_source: excer-ui-mock/assets/heroes/allowance-clock-opaque.png
- generator / model: Codex built-in image_gen / GPT Image 2.
- use_case: new-asset-with-style-reference.
- template: Family A canonical from work/excer-ui-mock-asset-plan.md.
- reference_images: prototype/assets/icons/lock-body.png — strict Family A material, softness, shading, edge quality, and visual-weight reference.
- generated_output: /Users/johansardar/.codex/generated_images/019fdd46-1b43-7971-9abd-588c3b00ec31/exec-e1878d28-80e6-45b2-be7f-a077c3a67fb2.png, 1254 × 1254 RGB, SHA-256 f36a47a0b1718951950cef0b5d5ffc1adf84d05c77faa1b187b3d73255dcd435.
- postprocess:
  - sips --resampleHeightWidth 1024 1024 /Users/johansardar/.codex/generated_images/019fdd46-1b43-7971-9abd-588c3b00ec31/exec-e1878d28-80e6-45b2-be7f-a077c3a67fb2.png --out excer-ui-mock/assets/heroes/allowance-clock-opaque.png
  - python3 prototype/scripts/remove_chroma_key.py excer-ui-mock/assets/heroes/allowance-clock-opaque.png excer-ui-mock/assets/heroes/allowance-clock.png --edge-contract 1 --despill
- dimensions_mode: raw 1254 × 1254 RGB; opaque 1024 × 1024 RGB; final 1024 × 1024 RGBA.
- validation: corner alpha [0,0,0,0]; residual chroma 0; visible pixels 503,984; coverage 0.480637; bbox [111,112,910,916].
- display_checks: accepted at 150 pt and at 96 pt stress size. Thick rounded case, broad ten-and-two hands, center hub, and shallow tick recesses remain clear; no numerals, bells, feet, dark holes, gloss, box, or fringe.
- screen_consumers: onboarding allowance picker; low-time education.
- sha256: opaque 62b39aa66327112aca4a83861e91f9ca52da7c328bf9ff304c1e22863e33c423; final c957b76525930fb0f435dbb51252eaa25bc33b9af7fe3648efea03bed3fff3ed.
- attempt / supersedes: 1 / none.
- rejection_reason: N/A.
- reviewer_date: Codex, 2026-08-07.

Verbatim prompt:

    Use case: new-asset-with-style-reference
    Asset type: 1024 × 1024 ExcerLock iOS hero illustration: DAILY FREE ALLOWANCE CLOCK.
    Input images: The supplied ExcerLock lock image or images are strict material, softness, shading, edge-quality, and visual-weight references. Match that ivory clay identity exactly; do not copy their padlock subject unless the request explicitly asks for a padlock.
    Primary request: Create one single centered friendly front-facing analog clock with a thick rounded case, two broad hands pointing to ten and two, and shallow evenly spaced tick recesses, with no numerals and no separate feet or bells. The subject must read instantly at 150 pt display size.
    Scene/backdrop: perfectly flat, uniform solid magenta #FF00FF filling every background pixel to every corner, solely for chroma-key removal. No gradient, texture, shadow, glow, vignette, floor, reflection, particles, or lighting variation in the background.
    Style/medium: soft matte 3D clay-like render; ivory white #F4F1F5 surfaces with soft neutral light-gray shading (#C9C4CC) and gentle rounded volume; recessed details are shaded soft light gray, never dark holes; no gloss, no metal, no hard shadows.
    Color palette: ivory white #F4F1F5 and soft neutral light-gray #C9C4CC only in the subject. Do not use cyan, blue, teal, pink, gold, red, gray outside the listed light-gray, black, orange, or magenta in the subject.
    Composition/framing: one centered subject occupying roughly 70% of the canvas with generous even padding; every subject pixel well separated from all four edges; strong readable silhouette at 150 pt.
    Constraints: the subject must be opaque and confidently solid-filled, not hollow wire art and not merely thickened outlines. Crisp clean outer edge for chroma keying. Front-facing or gently three-quarter as specified, with no detached accessory. No outer halo, bloom, cast shadow, energy field, black box, text, numerals, UI, frame, face, character, logo, or watermark. One cohesive subject only.

## paywall-hero

- asset_id: paywall-hero
- status: ACCEPTED
- family: A
- runtime_final: excer-ui-mock/assets/heroes/paywall-hero.png
- opaque_or_source: excer-ui-mock/assets/heroes/paywall-hero-opaque.png
- generator / model: Codex built-in image_gen / GPT Image 2.
- use_case: new-asset-with-style-reference.
- template: Family A canonical from work/excer-ui-mock-asset-plan.md.
- reference_images:
  - prototype/assets/icons/lock-body.png — strict Family A material, softness, shading, edge quality, and visual-weight reference.
  - prototype/assets/icons/lock-shackle.png — strict Family A material, softness, shading, edge quality, and visual-weight reference.
- generated_output: /Users/johansardar/.codex/generated_images/019fdd46-1b43-7971-9abd-588c3b00ec31/exec-2603e6c4-20e3-46c3-8079-ddcc36542387.png, 1254 × 1254 RGB, SHA-256 7dac4e4df8f6332c6c0875042ffdc3a1ed0ae2d9db835237b968c1e7aa874f05.
- postprocess:
  - sips --resampleHeightWidth 1024 1024 /Users/johansardar/.codex/generated_images/019fdd46-1b43-7971-9abd-588c3b00ec31/exec-2603e6c4-20e3-46c3-8079-ddcc36542387.png --out excer-ui-mock/assets/heroes/paywall-hero-opaque.png
  - python3 prototype/scripts/remove_chroma_key.py excer-ui-mock/assets/heroes/paywall-hero-opaque.png excer-ui-mock/assets/heroes/paywall-hero.png --edge-contract 1 --despill
- dimensions_mode: raw 1254 × 1254 RGB; opaque 1024 × 1024 RGB; final 1024 × 1024 RGBA.
- validation: corner alpha [0,0,0,0]; residual chroma 0; visible pixels 296,915; coverage 0.283160; bbox [190,125,824,901].
- display_checks: accepted at 185 pt and at 96 pt stress size. Open shackle lifted right, joined lock body, analog clock face, hands, and ticks remain readable as one emblem; no detached accessory, dark hole, gloss, box, or fringe.
- screen_consumers: paywall; subscription detail header.
- sha256: opaque 64bc2a9b11864d0258c945c6ef9a6a16a4a430d60e07939adc2affb68d88c2bf; final 01ea2ede935e4a01b7ded836d4ec83c3381f0609d6380a49960ce6796d3d9490.
- attempt / supersedes: 1 / none.
- rejection_reason: N/A.
- reviewer_date: Codex, 2026-08-07.

Verbatim prompt:

    Use case: new-asset-with-style-reference
    Asset type: 1024 × 1024 ExcerLock iOS hero illustration: PAYWALL OPEN TIME LOCK.
    Input images: The supplied ExcerLock lock image or images are strict material, softness, shading, edge-quality, and visual-weight references. Match that ivory clay identity exactly; do not copy their padlock subject unless the request explicitly asks for a padlock.
    Primary request: Create one single centered cohesive open padlock with its thick rounded shackle lifted slightly to the right and one large rounded analog-clock face embossed into the body, a single joined sculptural emblem of time opening up. The subject must read instantly at 185 pt display size.
    Scene/backdrop: perfectly flat, uniform solid magenta #FF00FF filling every background pixel to every corner, solely for chroma-key removal. No gradient, texture, shadow, glow, vignette, floor, reflection, particles, or lighting variation in the background.
    Style/medium: soft matte 3D clay-like render; ivory white #F4F1F5 surfaces with soft neutral light-gray shading (#C9C4CC) and gentle rounded volume; recessed details are shaded soft light gray, never dark holes; no gloss, no metal, no hard shadows.
    Color palette: ivory white #F4F1F5 and soft neutral light-gray #C9C4CC only in the subject. Do not use cyan, blue, teal, pink, gold, red, gray outside the listed light-gray, black, orange, or magenta in the subject.
    Composition/framing: one centered subject occupying roughly 70% of the canvas with generous even padding; every subject pixel well separated from all four edges; strong readable silhouette at 185 pt.
    Constraints: the subject must be opaque and confidently solid-filled, not hollow wire art and not merely thickened outlines. Crisp clean outer edge for chroma keying. Front-facing or gently three-quarter as specified, with no detached accessory. No outer halo, bloom, cast shadow, energy field, black box, text, numerals, UI, frame, face, character, logo, or watermark. One cohesive subject only.

## empty-conditions

- asset_id: empty-conditions
- status: ACCEPTED
- family: A
- runtime_final: excer-ui-mock/assets/heroes/empty-conditions.png
- opaque_or_source: excer-ui-mock/assets/heroes/empty-conditions-opaque.png
- generator / model: Codex built-in image_gen / GPT Image 2.
- use_case: new-asset-with-style-reference.
- template: Family A canonical from work/excer-ui-mock-asset-plan.md.
- reference_images: prototype/assets/icons/lock-body.png — strict Family A material, softness, shading, edge quality, and visual-weight reference.
- generated_output: /Users/johansardar/.codex/generated_images/019fdd46-1b43-7971-9abd-588c3b00ec31/exec-f22f3352-64cd-4a48-a8fe-db8bca0e5ef3.png, 1254 × 1254 RGB, SHA-256 d20791f6c8c1b122aed3f9d011a616f1426064ff1e153d0c447ce71eef540557.
- postprocess:
  - sips --resampleHeightWidth 1024 1024 /Users/johansardar/.codex/generated_images/019fdd46-1b43-7971-9abd-588c3b00ec31/exec-f22f3352-64cd-4a48-a8fe-db8bca0e5ef3.png --out excer-ui-mock/assets/heroes/empty-conditions-opaque.png
  - python3 prototype/scripts/remove_chroma_key.py excer-ui-mock/assets/heroes/empty-conditions-opaque.png excer-ui-mock/assets/heroes/empty-conditions.png --edge-contract 1 --despill
- dimensions_mode: raw 1254 × 1254 RGB; opaque 1024 × 1024 RGB; final 1024 × 1024 RGBA.
- validation: corner alpha [0,0,0,0]; residual chroma 0; visible pixels 503,046; coverage 0.479742; bbox [149,151,870,873].
- display_checks: accepted at 125 pt and at 96 pt stress size. Upright rounded card, broad recessed plus, and folded lower-right corner remain clear as one cohesive object; no detached piece, dark hole, gloss, box, or fringe.
- screen_consumers: Home empty state; Manage no-condition state.
- sha256: opaque 46c88fc3a8e248e679e79439df6a3470679f3eadea4101d43c3bb802e038fcf0; final af2fd11e6f03c1ae8d273e8f92bc4503f9ea5b69287db0312aee7e6dd5d6ac21.
- attempt / supersedes: 1 / none.
- rejection_reason: N/A.
- reviewer_date: Codex, 2026-08-07.

Verbatim prompt:

    Use case: new-asset-with-style-reference
    Asset type: 1024 × 1024 ExcerLock iOS hero illustration: EMPTY CONDITIONS.
    Input images: The supplied ExcerLock lock image or images are strict material, softness, shading, edge-quality, and visual-weight references. Match that ivory clay identity exactly; do not copy their padlock subject unless the request explicitly asks for a padlock.
    Primary request: Create one single centered single upright rounded clay condition card with one broad recessed plus sign at its center and a softly folded lower-right corner, all fused as one solid object. The subject must read instantly at 125 pt display size.
    Scene/backdrop: perfectly flat, uniform solid magenta #FF00FF filling every background pixel to every corner, solely for chroma-key removal. No gradient, texture, shadow, glow, vignette, floor, reflection, particles, or lighting variation in the background.
    Style/medium: soft matte 3D clay-like render; ivory white #F4F1F5 surfaces with soft neutral light-gray shading (#C9C4CC) and gentle rounded volume; recessed details are shaded soft light gray, never dark holes; no gloss, no metal, no hard shadows.
    Color palette: ivory white #F4F1F5 and soft neutral light-gray #C9C4CC only in the subject. Do not use cyan, blue, teal, pink, gold, red, gray outside the listed light-gray, black, orange, or magenta in the subject.
    Composition/framing: one centered subject occupying roughly 70% of the canvas with generous even padding; every subject pixel well separated from all four edges; strong readable silhouette at 125 pt.
    Constraints: the subject must be opaque and confidently solid-filled, not hollow wire art and not merely thickened outlines. Crisp clean outer edge for chroma keying. Front-facing or gently three-quarter as specified, with no detached accessory. No outer halo, bloom, cast shadow, energy field, black box, text, numerals, UI, frame, face, character, logo, or watermark. One cohesive subject only.

## Standalone acceptance

The two canonical lock pairs match their prototype source files byte-for-byte for both opaque and keyed forms. The six new opaque files are pixel-identical to 1024 × 1024 sips normalizations of the recorded raw ImageGen outputs. All eight keyed finals pass validate_icons.py and the intended-size/96 pt visual review. No application code, PNG, or other manifest was changed while creating this record.
