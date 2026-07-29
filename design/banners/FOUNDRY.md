# Condition banner foundry — Family C manifest (ticket #25)

Every generation for the v1 21-banner library (PRD §3.15/§8, conditions grill 2026-07-28) is logged here — accepted and rejected. No entry ⇒ the asset doesn't ship. Produced per `design/STYLE.md` Family C.

## Common production settings (all generated banners)

- **Tool:** Higgsfield MCP `generate_image`
- **Model:** requested `nano_banana_pro` — Higgsfield routes/reports it as `nano_banana_2` (same Nano Banana Pro engine; noted verbatim from job payloads)
- **Aspect/resolution:** 21:9 @ 2k → raw output **3168×1344**
- **Style reference:** `prototype/assets/icons/gym-card.png` (the Family C anchor) uploaded once as Higgsfield media `e68376c1-6423-4368-a09d-0ade2dc5e649`, passed as `medias:[{role:"image", value:<that id>}]` on **every** generation
- **Crop:** center-crop full-height to 2.21:1 with `sips -c 1344 2970` → final **2970×1344** (side trim only — the calm bottom third survives untouched). Uncropped original kept beside each final as `<name>-full.png`.
- **Judgment gates (per STYLE.md Family C):** style match to anchor · no visible faces (no people, or silhouette/from-behind only) · no text/UI/logos · calm low-detail bottom third (must survive dark scrim + white overlay text) · card ratio ≈ 2.21:1

### Shared prompt template

Every prompt = `STYLE_BLOCK + Scene: <scene> + CONSTRAINTS_BLOCK`, where:

- **STYLE_BLOCK:** `Match the art style of the reference image exactly: Spider-Verse-inspired stylized animation, painterly comic-film rendering with visible brush texture, warm dark palette of deep indigo and navy shadows with glowing warm orange highlights, moody cinematic lighting.`
- **CONSTRAINTS_BLOCK:** `No people anywhere. No text, no letters, no numbers, no signage, no UI, no logos anywhere in the image. Wide cinematic banner composition; keep the bottom third of the frame calm, dark and low-detail — <ground phrase> — so white overlay text stays legible there.` (Scenes that include a human figure swap the first sentence for a from-behind/full-silhouette clause; noted per entry.)

Per-banner entries below log the scene slot + any deviation, verbatim.

## Default mapping (PRD §3.15, DECIDED 2026-07-28 — a rule, not a table)

- Every catalog entry defaults to the **first banner of its activity family**: gym → `gym-1` · running → `run-1` · walking → `walk-1` · cycling → `cycle-1` · swimming → `swim-1`
- Universal-effort and connected-app entries → `general-1` (abstract energy), except obvious family homes: **Hevy strength → gym-1 · Whoop strain → general-1 (abstract energy) · Concept2 row → swim-2 (open water)**
- **Per-gym conditions cycle the gym banners** (gym-1, gym-2, gym-3, gym-4 per saved gym) so two saved gyms never wear identical cards.

---

## Gym family (4)

### gym-1 — weights floor ✅ ACCEPTED (pre-approved anchor, not generated)
- **Final:** `design/banners/gym-1.png` (1083×489 ≈ 2.215:1)
- **Source:** verbatim copy of `prototype/assets/icons/gym-card.png` — the approved Family C style anchor itself. PRD §3.15: "weights floor = the anchor". No generation, no crop, no `-full` original.
- **Judgment:** approved by definition (it is the anchor).

### gym-2 — squat rack ✅ ACCEPTED (attempt 1)
- **Final:** `design/banners/gym-2.png` (2970×1344) · original `gym-2-full.png` (3168×1344)
- **Job:** `51d57b0d-d0bb-4e88-88f7-26b12cea146f` · model `nano_banana_2` (requested nano_banana_pro) · 21:9 @2k · ref media `e68376c1-…` (anchor)
- **Prompt (verbatim):** Match the art style of the reference image exactly: Spider-Verse-inspired stylized animation, painterly comic-film rendering with visible brush texture, warm dark palette of deep indigo and navy shadows with glowing warm orange highlights, moody cinematic lighting. Scene: a power squat rack with a loaded barbell resting on the J-hooks inside a dark gym at dusk, warm orange light from tall industrial windows raking across the steel uprights, weight plates stacked beside it. No people anywhere. No text, no letters, no numbers, no signage, no UI, no logos anywhere in the image. Wide cinematic banner composition; keep the bottom third of the frame calm, dark and low-detail — plain gym floor in shadow — so white overlay text stays legible there.
- **Judgment:** style matches anchor (painterly indigo + orange rim light); no people; no text; bottom third is plain dark floor — scrim-safe. Center crop preserved full composition.

### gym-3 — sunset gym ✅ ACCEPTED (attempt 1)
- **Final:** `design/banners/gym-3.png` (2970×1344) · original `gym-3-full.png` (3168×1344)
- **Job:** `3598d038-6f9e-491a-8e83-d6c453d21764` · model `nano_banana_2` (requested nano_banana_pro) · 21:9 @2k · ref media `e68376c1-…` (anchor)
- **Prompt (verbatim):** Match the art style of the reference image exactly: Spider-Verse-inspired stylized animation, painterly comic-film rendering with visible brush texture, warm dark palette of deep indigo and navy shadows with glowing warm orange highlights, moody cinematic lighting. Scene: the interior of a dark gym facing floor-to-ceiling windows with a blazing orange sunset over a city skyline outside, dumbbells and benches silhouetted against the glow. No people anywhere. No text, no letters, no numbers, no signage, no UI, no logos anywhere in the image. Wide cinematic banner composition; keep the bottom third of the frame calm, dark and low-detail — plain gym floor in shadow — so white overlay text stays legible there.
- **Judgment:** strongest of the family — silhouetted dumbbell racks against blazing skyline, palette identical to anchor; no people/text; bottom third plain dark floor.

### gym-4 — cable row ✅ ACCEPTED (attempt 1)
- **Final:** `design/banners/gym-4.png` (2970×1344) · original `gym-4-full.png` (3168×1344)
- **Job:** `9b2c692b-60b1-4f38-bfa3-ac7097e1bc62` · model `nano_banana_2` (requested nano_banana_pro) · 21:9 @2k · ref media `e68376c1-…` (anchor)
- **Prompt (verbatim):** Match the art style of the reference image exactly: Spider-Verse-inspired stylized animation, painterly comic-film rendering with visible brush texture, warm dark palette of deep indigo and navy shadows with glowing warm orange highlights, moody cinematic lighting. Scene: a seated cable row machine in a dark gym, its steel weight stack and taut cable catching warm orange rim light from a tall window, faint dust in the light beam. No people anywhere. No text, no letters, no numbers, no signage, no UI, no logos anywhere in the image. Wide cinematic banner composition; keep the bottom third of the frame calm, dark and low-detail — plain gym floor in shadow — so white overlay text stays legible there.
- **Judgment:** weight stack + cable catch warm rim light exactly in anchor register; dust motes add depth without noise; no people/text; calm dark bottom third.
