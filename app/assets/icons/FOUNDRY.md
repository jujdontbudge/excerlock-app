# app/assets/icons — foundry record

Per `design/STYLE.md` §5 (manifest law). The six original glyphs here were
harvested byte-identical from the frozen prototype (their full records live in
`prototype/assets/icons/FOUNDRY.md`) and later downsized to 512² on ticket #41.
The three tab glyphs below were forged new on ticket #41.

All three used **Template B2** from `prototype/assets/icons/FOUNDRY.md` verbatim
(only `⟨NAME⟩`/`⟨SUBJECT⟩`/`⟨SIZE⟩` filled), generated via Codex built-in
`image_gen` (GPT Image 2) on flat magenta #FF00FF, then:

```bash
sips --resampleHeightWidth 1024 1024 <opaque> --out <1024>
python3 prototype/scripts/remove_chroma_key.py <1024> <final> --edge-contract 1 --despill
python3 prototype/scripts/validate_icons.py <final>
sips --resampleHeightWidth 512 512 <final> --out app/assets/icons/<final>
```

Opaque edit targets: `design/glyphs/icon-tab-{house,sliders,gear}-opaque.png`.
Crops in `app/src/ui/icons/manifest.ts` are alpha bboxes in 1024-space
(the validator's `visible_bbox`).

| Final asset | Template | `⟨NAME⟩` | `⟨SUBJECT⟩` | `⟨SIZE⟩` |
|---|---:|---|---|---:|
| `icon-tab-house.png` | B2 | `ICON TAB HOUSE` | `simple friendly house with a wide solid body, gently pitched roof, and one small rounded door cutout` | 30 |
| `icon-tab-sliders.png` | B2 | `ICON TAB SLIDERS` | `set of three horizontal slider tracks stacked evenly, each track a generous rounded bar with one solid round knob, knobs at varied positions` | 30 |
| `icon-tab-gear.png` | B2 | `ICON TAB GEAR` | `classic solid gear with eight rounded teeth and one round center cutout` | 30 |

## Validation (all gates passed; zero rejects this batch)

| Asset | RGBA | Corners α0 | Residual chroma | Coverage | visible_bbox (1024-space) |
|---|---|---|---|---|---|
| icon-tab-house.png | ✓ | ✓ | 0 | 0.303 | [125, 160, 899, 837] |
| icon-tab-sliders.png | ✓ | ✓ | 0 | 0.137 | [168, 231, 857, 795] |
| icon-tab-gear.png | ✓ | ✓ | 0 | 0.237 | [180, 174, 844, 850] |

Visual check: composited on #1A0F06 at 256px — clean silhouettes, no fringe,
no box. `icon-tab-spiral.png`, `icon-pencil.png`, `icon-info.png` are no longer
tab glyphs but stay shipped for future row/chip use.
