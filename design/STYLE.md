# ExcerLock Visual Foundry — the universal style constitution

**This file is law.** Any agent (Codex, Claude, Higgsfield workflow, human) about to create ANY visual asset for ExcerLock — icon, glyph, hero illustration, banner, mockup, splash, empty-state art, share card, app icon — MUST read this file first and produce the asset through one of the five families below. If an asset idea doesn't fit a family, stop and ask Johan; never invent a sixth style ad hoc.

Why it exists: the first Codex UI build proved the method (see the shipped record `prototype/assets/icons/FOUNDRY.md` — 13/13 assets passed validation on the proven templates). This doc promotes that method plus `design/pillow-style-guide.md` into the single source of truth.

---

## 1. The five asset families — pick exactly one

| Family | What it's for | Look | Tool |
|---|---|---|---|
| **A — Soft-clay hero** | Hero objects: the lock, celebration props, onboarding/permission-explainer art, empty-state art | Soft matte 3D clay render; **ivory #F4F1F5** surfaces, soft light-gray **#C9C4CC** shading, gentle rounded volume; recessed details are shaded gray, never dark holes; no gloss/metal/hard shadows | GPT Image 2 via Codex `image_gen`, magenta pipeline (§3) |
| **B — Flat white glyph** | UI icons: tab bar, rows, chips, buttons, settings leading icons | Flat 2D vector-like glyph, **pure white #FFFFFF** only; rounded stroke ends/joins, generous weight, solid confident shapes; zero gradients/glow/3D/wire-outlines. Tint at render time via `tintColor` — never bake color | GPT Image 2, magenta pipeline (§3) |
| **C — Painted banner** | Condition banners (§3.15 of the PRD), any wide scene illustration | **Spider-Verse-inspired stylized animation** (corrected 2026-07-28 — the anchor was always this style; "semi-realistic painted" was a misnomer), warm dark palette; **no visible faces in any banner** (environments/objects; figures at most from behind or in silhouette); **style anchor = the approved gym card** (`prototype/assets/icons/gym-card.png`, cleaned; originally cropped from `design/mockups/nosparkle-v14-best.png` box `(48,1331,1131,1820)`); card ratio ≈ 2.21:1; must survive a dark bottom scrim + white overlay text | Higgsfield (`nano_banana_pro` for new scenes; seedream/seedance per video lessons), style-reference the anchor |
| **D — Full-screen mockup** | Whole-screen design comps | Pillow DNA on the orange theme — full token set in `design/pillow-style-guide.md` (bg gradient #1A0F06→#C2570A, translucent borderless cards, pill buttons, SF Rounded hero numerals, one accent per element, don'ts list) | Per the `ios-mockup-sizing` skill + `docs/codex-dashboard-ui-build-spec.md` |
| **E — Composed square** | Assets that must be an **opaque square**: app icon, splash logo, store marks | A shipped Family A/B subject centered on a flat brand fill. Subject at **46% of the side**, ≥8% safe inset, background **#F25A16** (the single-stop midpoint of #F98529→#EB2E02) | `prototype/scripts/compose_square.py` + `validate_square.py` — deterministic composition, **no image model** |

**Family E exists because an opaque square is the one thing A–D cannot produce.** Families A and B are keyed cutouts on transparent backgrounds — that is the entire point of the magenta pipeline (§3) — while the palette law below forbids baking the orange into an icon subject. But **an iOS app icon may not carry an alpha channel at all**, so something has to own the composition step. Family E is that step, and it is a script, not a generation: it takes an already-validated subject and paints it onto the brand fill, so the same inputs always produce byte-identical output.

Rules:
- **Never generate a Family E asset.** If the subject you need doesn't exist, ship it through Family A or B first, then compose.
- The fill is **flat, not the gradient** — the orange gradient stays in the background/UI layer per the palette law. Family E's single stop is the sanctioned exception, and only as a fill behind the subject.
- Gates are in `validate_square.py`: exact square, correct color mode (RGB for icons — alpha rejected by Apple; RGBA for splash logos), corners equal the declared fill, subject centered within 3%, subject spans 28–72% of the side, ≥8% inset from the edge so iOS's superellipse mask can't clip it, zero residual chroma.
- Shipped example and the exact commands: `app/src/branding/README.md`.

Palette law across ALL families: subjects use only the colors named in their family. The screen's orange gradient (#F98529→#EB2E02 sampled from the approved mockup) lives in the **background/UI layer**, never baked into icons. Family B icons are white so code can tint them.

## 2. The style anchors (fixed reference images — pass these as reference inputs)

| Anchor | Path | Use as reference for |
|---|---|---|
| Approved dashboard screen | `design/mockups/nosparkle-v14-best.png` | Family D; overall palette sampling |
| Lock hero (body+shackle context) | crop box `(340,520,840,1130)` of the mockup (`prototype/assets/icons/lock-reference.png`) | Family A identity |
| Shipped clay pieces | `prototype/assets/icons/lock-body.png`, `lock-shackle.png` | Family A material/shading |
| Cleaned gym card | `prototype/assets/icons/gym-card.png` | Family C style anchor |
| Shipped glyph set | `prototype/assets/icons/icon-*.png` | Family B weight/geometry |
| Unlock animation | `design/mockups/unlock-animation-v18-noconfetti-iphone.mp4` | Motion reference |
| App icon | `app/assets/icon.png` | Family E composition, fill, and subject scale |

New approved assets get **added to this table** — the anchor set grows, the style converges.

## 3. The mechanical pipeline (families A & B — non-negotiable)

1. Generate at **1024×1024** on a **perfectly flat solid magenta #FF00FF** background (the prompt templates below enforce it).
2. Normalize + key + validate:
   ```bash
   sips --resampleHeightWidth 1024 1024 <opaque.png> --out <1024.png>
   python3 prototype/scripts/remove_chroma_key.py <1024.png> <final.png> --edge-contract 1 --despill
   python3 prototype/scripts/validate_icons.py <final.png>
   ```
3. **Validation gates (all must pass):** RGBA · four corners alpha `0,0,0,0` · zero residual pixels matching `alpha>0 AND R>G+60 AND B>G+60` · sane coverage for the display size · visual check at final size on the real gradient (no magenta fringe, no box).
4. Keep the opaque model output beside the keyed final (`*-opaque.png`) — it's the edit target for corrections.
5. **Corrections use `precise-object-edit` on the existing output** — never regenerate from scratch to fix one flaw, and never rewrite a working prompt's style language (the same keyframe lesson as the videos). Two failed attempts on one asset → stop and ask.

## 4. The literal prompt templates (proven — fill slots, change nothing else)

The FOUNDRY.md record contains the exact shipped prompts. Reuse them verbatim:

- **Family A** — the `lock-body.png` / `lock-shackle.png` prompts in `prototype/assets/icons/FOUNDRY.md` are the canonical Family-A template: swap only the subject description lines (Asset type / Primary request / composition size), keep the Scene/Style/Palette/Constraints blocks word-for-word (ivory clay + magenta + "no halo/bloom/shadow/text/one subject only").
- **Family B** — use **Template B2** from FOUNDRY.md (the ~65%-canvas variant; it superseded B1): replace only `⟨NAME⟩`, `⟨SUBJECT⟩`, `⟨SIZE⟩`. Write `⟨SUBJECT⟩` as a one-line concrete physical description (see the shipped table for the register).
- **Family C** — prompt Higgsfield with the gym-card anchor as style reference + "same Spider-Verse-inspired stylized animation style, warm dark palette, no visible faces anywhere, no text/UI/logo anywhere, composition leaves the bottom third calm for a scrim". The v1 library is the 21-banner set specced in PRD §8/§3.15 (conditions grill, 2026-07-28).
- Regen's solid-fill docs (`~/reform/docs/onboarding-image-gen-recipe.md` + the three illustration records) are the pedigree of this structure — consult for correction-prompt phrasing patterns.

## 5. The manifest law

Every generated asset — accepted or rejected — is logged in the nearest `FOUNDRY.md` (create one per asset directory) with: final path, template used, the verbatim prompt, reference images passed, validation table row, and rejection reason if killed. No manifest entry ⇒ the asset doesn't ship. This is what makes the style reproducible by the next agent with zero context.

## 6. Enforcement

- Root `AGENTS.md` + `CLAUDE.md` point here — any agent in this repo sees the rule at session start.
- Prompts to external builders (Codex tasks, Higgsfield workflows) must include: *"Before creating any visual asset, read `design/STYLE.md` and follow it exactly."*
- Review rule: an asset that skipped the pipeline or deviates from its family is rejected on sight, regardless of how good it looks — one-off beauty is how design systems die.
