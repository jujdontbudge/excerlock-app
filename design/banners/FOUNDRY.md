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

## Running family (3)

### run-1 — road dawn ✅ ACCEPTED (attempt 1)
- **Final:** `design/banners/run-1.png` (2970×1344) · original `run-1-full.png` (3168×1344)
- **Job:** `37dea008-14fe-4ad5-8490-4ff8522e0ea2` · model `nano_banana_2` (requested nano_banana_pro) · 21:9 @2k · ref media `e68376c1-…` (anchor)
- **Prompt (verbatim):** Match the art style of the reference image exactly: Spider-Verse-inspired stylized animation, painterly comic-film rendering with visible brush texture, warm dark palette of deep indigo and navy shadows with glowing warm orange highlights, moody cinematic lighting. Scene: an empty open asphalt road stretching toward the horizon at dawn, the low sun blazing warm orange above distant dark hills, long indigo shadows raking across the tarmac. No people anywhere. No text, no letters, no numbers, no signage, no UI, no logos anywhere in the image. Wide cinematic banner composition; keep the bottom third of the frame calm, dark and low-detail — plain road surface in shadow — so white overlay text stays legible there.
- **Judgment:** converging perspective into the dawn sun, painterly brush streaks on tarmac; no people/text. The dark foreground band starts with a fairly hard edge ~60% down — reads as the prompted long shadow and makes the bottom third exceptionally scrim-safe. Accepted.

### run-2 — track ✅ ACCEPTED (attempt 1)
- **Final:** `design/banners/run-2.png` (2970×1344) · original `run-2-full.png` (3168×1344)
- **Job:** `057239f7-0bb6-4d57-be54-5e9c24d15cad` · model `nano_banana_2` (requested nano_banana_pro) · 21:9 @2k · ref media `e68376c1-…` (anchor)
- **Prompt (verbatim):** Match the art style of the reference image exactly: Spider-Verse-inspired stylized animation, painterly comic-film rendering with visible brush texture, warm dark palette of deep indigo and navy shadows with glowing warm orange highlights, moody cinematic lighting. Scene: the sweeping curve of an outdoor running track at dusk, warm floodlight glow raking across the rubber lanes, dark empty stadium stands in silhouette behind, plain unmarked lane lines only. No people anywhere. No text, no letters, no numbers, no signage, no UI, no logos anywhere in the image. Wide cinematic banner composition; keep the bottom third of the frame calm, dark and low-detail — plain track surface in shadow — so white overlay text stays legible there.
- **Judgment:** sweeping lane curve under warm floodlight, silhouetted stands; lanes clean of numbers ("plain unmarked lane lines" clause worked); bottom third dark plain track. Accepted.

### run-3 — forest trail ✅ ACCEPTED (attempt 1)
- **Final:** `design/banners/run-3.png` (2970×1344) · original `run-3-full.png` (3168×1344)
- **Job:** `cd2c2eb8-6856-459a-97cb-3884767edace` · model `nano_banana_2` (requested nano_banana_pro) · 21:9 @2k · ref media `e68376c1-…` (anchor)
- **Prompt (verbatim):** Match the art style of the reference image exactly: Spider-Verse-inspired stylized animation, painterly comic-film rendering with visible brush texture, warm dark palette of deep indigo and navy shadows with glowing warm orange highlights, moody cinematic lighting. Scene: a winding dirt running trail through a dark forest, low golden-hour sunlight streaming between tall tree trunks in warm shafts, leaf edges glowing orange against deep indigo shade. No people anywhere. No text, no letters, no numbers, no signage, no UI, no logos anywhere in the image. Wide cinematic banner composition; keep the bottom third of the frame calm, dark and low-detail — plain trail ground in shadow — so white overlay text stays legible there.
- **Judgment:** ink-outlined trunks + glowing leaf clusters — the most comic-book sheet of the set, squarely on-anchor; winding path pulls the eye; bottom third calm indigo ground. Accepted.

## Walking family (3)

### walk-1 — city sidewalk ✅ ACCEPTED (attempt 1)
- **Final:** `design/banners/walk-1.png` (2970×1344) · original `walk-1-full.png` (3168×1344)
- **Job:** `8c5fc1d8-58d9-4eea-95b9-60f4d3ae250f` · model `nano_banana_2` (requested nano_banana_pro) · 21:9 @2k · ref media `e68376c1-…` (anchor)
- **Prompt (verbatim):** Match the art style of the reference image exactly: Spider-Verse-inspired stylized animation, painterly comic-film rendering with visible brush texture, warm dark palette of deep indigo and navy shadows with glowing warm orange highlights, moody cinematic lighting. Scene: a city sidewalk in golden evening light, warm sun glow washing over brownstone facades and a line of street trees, long indigo shadows across the pavement, a few distant pedestrians only as small dark silhouettes far away. No visible faces anywhere — any figures are tiny distant full silhouettes only. No text, no letters, no numbers, no signage, no UI, no logos anywhere in the image. Wide cinematic banner composition; keep the bottom third of the frame calm, dark and low-detail — plain sidewalk pavement in shadow — so white overlay text stays legible there.
- **Deviation from template:** first constraint sentence swapped for the silhouette clause (scene includes distant figures).
- **Judgment:** golden-hour brownstone sidewalk; the few pedestrians are tiny featureless full silhouettes — compliant with the no-visible-faces law; no text (facades clean); bottom third shadowed plain pavement. Accepted.

### walk-2 — park path ✅ ACCEPTED (attempt 1)
- **Final:** `design/banners/walk-2.png` (2970×1344) · original `walk-2-full.png` (3168×1344)
- **Job:** `ef6ba411-df1c-40cb-b10a-e7268e07c9a1` · model `nano_banana_2` (requested nano_banana_pro) · 21:9 @2k · ref media `e68376c1-…` (anchor)
- **Prompt (verbatim):** Match the art style of the reference image exactly: Spider-Verse-inspired stylized animation, painterly comic-film rendering with visible brush texture, warm dark palette of deep indigo and navy shadows with glowing warm orange highlights, moody cinematic lighting. Scene: a winding park path at dusk lined with glowing wrought-iron lampposts, autumn trees arching overhead with leaf edges catching warm orange light, deep indigo shade beyond. No people anywhere. No text, no letters, no numbers, no signage, no UI, no logos anywhere in the image. Wide cinematic banner composition; keep the bottom third of the frame calm, dark and low-detail — plain path surface in shadow — so white overlay text stays legible there.
- **Judgment:** arched autumn canopy + glowing lanterns, purple-indigo depth — strongly on-anchor; no people/text; S-curve path leads into calm dark foreground. Accepted.

### walk-3 — night walk ✅ ACCEPTED (attempt 1)
- **Final:** `design/banners/walk-3.png` (2970×1344) · original `walk-3-full.png` (3168×1344)
- **Job:** `520a17f5-e197-4c2f-8aee-8b0ec53fb069` · model `nano_banana_2` (requested nano_banana_pro) · 21:9 @2k · ref media `e68376c1-…` (anchor)
- **Prompt (verbatim):** Match the art style of the reference image exactly: Spider-Verse-inspired stylized animation, painterly comic-film rendering with visible brush texture, warm dark palette of deep indigo and navy shadows with glowing warm orange highlights, moody cinematic lighting. Scene: a quiet city street at night, warm orange streetlamps glowing against deep indigo darkness, soft pools of light on the empty pavement, dark building silhouettes and a hint of mist. No people anywhere. No text, no letters, no numbers, no signage, no UI, no logos anywhere in the image. Wide cinematic banner composition; keep the bottom third of the frame calm, dark and low-detail — plain pavement in shadow — so white overlay text stays legible there.
- **Judgment:** misty night intersection, lamp pools on empty pavement; storefront awning/sign shapes are blank (no letters); no people; bottom third near-black pavement — best scrim surface of the family. Accepted.

## Cycling family (3)

### cycle-1 — open road ✅ ACCEPTED (attempt 1)
- **Final:** `design/banners/cycle-1.png` (2970×1344) · original `cycle-1-full.png` (3168×1344)
- **Job:** `5b96910f-788b-4148-abbd-f222a019873a` · model `nano_banana_2` (requested nano_banana_pro) · 21:9 @2k · ref media `e68376c1-…` (anchor)
- **Prompt (verbatim):** Match the art style of the reference image exactly: Spider-Verse-inspired stylized animation, painterly comic-film rendering with visible brush texture, warm dark palette of deep indigo and navy shadows with glowing warm orange highlights, moody cinematic lighting. Scene: a lone road bicycle leaning on its kickstand at the edge of a long empty open road at sunset, the low sun blazing warm orange on the horizon, plains and distant hills in deep indigo shadow, the bike rim catching a bright rim light. No people anywhere. No text, no letters, no numbers, no signage, no UI, no logos anywhere in the image. Wide cinematic banner composition; keep the bottom third of the frame calm, dark and low-detail — plain road surface in shadow — so white overlay text stays legible there.
- **Judgment:** glowing rim-lit wheels against the sunset vanishing point — on-anchor; no people/text; bottom-left two-thirds (the text zone) is calm dark road; rear wheel dips into bottom-right third but stays clear of the overlay area. Accepted.

### cycle-2 — mountain climb ✅ ACCEPTED (attempt 1)
- **Final:** `design/banners/cycle-2.png` (2970×1344) · original `cycle-2-full.png` (3168×1344)
- **Job:** `bd631266-7cd8-4122-b5ce-01625fbe93ab` · model `nano_banana_2` (requested nano_banana_pro) · 21:9 @2k · ref media `e68376c1-…` (anchor)
- **Prompt (verbatim):** Match the art style of the reference image exactly: Spider-Verse-inspired stylized animation, painterly comic-film rendering with visible brush texture, warm dark palette of deep indigo and navy shadows with glowing warm orange highlights, moody cinematic lighting. Scene: a cyclist seen from far behind as a full dark silhouette, climbing a steep winding mountain road at dusk, hairpin switchbacks glowing warm orange where the low sun rakes the asphalt, dark mountain ridges layered in deep indigo behind. Figure strictly from behind in full silhouette, no visible face anywhere. No text, no letters, no numbers, no signage, no UI, no logos anywhere in the image. Wide cinematic banner composition; keep the bottom third of the frame calm, dark and low-detail — plain road surface in shadow — so white overlay text stays legible there.
- **Deviation from template:** first constraint sentence swapped for the from-behind/full-silhouette clause (scene includes one figure).
- **Judgment:** the one human figure is a pure full silhouette from behind — compliant; glowing hairpins ladder up the mountains; bottom third is a flat dark asphalt apron, ideal scrim zone. Accepted.

### cycle-3 — city commute ✅ ACCEPTED (attempt 1)
- **Final:** `design/banners/cycle-3.png` (2970×1344) · original `cycle-3-full.png` (3168×1344)
- **Job:** `202ba6eb-a54f-4a29-b82e-b3d07442d0c1` · model `nano_banana_2` (requested nano_banana_pro) · 21:9 @2k · ref media `e68376c1-…` (anchor)
- **Prompt (verbatim):** Match the art style of the reference image exactly: Spider-Verse-inspired stylized animation, painterly comic-film rendering with visible brush texture, warm dark palette of deep indigo and navy shadows with glowing warm orange highlights, moody cinematic lighting. Scene: a city bicycle with a basket leaning against a lamppost on an evening street corner, warm shop-window glow and orange streetlight against deep indigo dusk, bicycle frame catching the light. No people anywhere. No text, no letters, no numbers, no signage, no UI, no logos anywhere in the image; shop windows are empty warm glass with no lettering. Wide cinematic banner composition; keep the bottom third of the frame calm, dark and low-detail — plain pavement in shadow — so white overlay text stays legible there.
- **Judgment:** basket bike at the lamppost, glowing empty shop glass (the "empty warm glass, no lettering" clause worked); no people; bottom third shadowed curb/pavement, calm enough for scrim. Accepted.
