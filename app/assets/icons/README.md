# App glyph assets

**Nothing in this directory was generated here.** Every PNG is a byte-identical copy of an approved
Family-B ("flat white glyph") asset from the frozen prototype:
`prototype/assets/icons/` — whose `FOUNDRY.md` holds the exact prompt, pipeline and validation numbers for
each one. That file is the manifest of record under `design/STYLE.md`; this README only records the copy.

| File | Source | Used as |
|---|---|---|
| `icon-tab-spiral.png` | `prototype/assets/icons/icon-tab-spiral.png` | Home tab (provisional) |
| `icon-pencil.png` | `prototype/assets/icons/icon-pencil.png` | Manage tab (provisional) |
| `icon-tab-chart.png` | `prototype/assets/icons/icon-tab-chart.png` | Analysis tab |
| `icon-info.png` | `prototype/assets/icons/icon-info.png` | Settings tab (provisional) |
| `icon-padlock-chip.png` | `prototype/assets/icons/icon-padlock-chip.png` | Home empty-state chip |
| `icon-arrow-right.png` | `prototype/assets/icons/icon-arrow-right.png` | continue-CTA suffix |

Rules for anyone touching this directory:

- Assets ship **white**. Colour is applied at render with `tintColor` — never bake a tint into a PNG.
- Each glyph's alpha bounding box is recorded in `app/src/ui/icons/manifest.ts`; `Glyph` crops to it so
  `size` means the ink's width, not the padded 1024² canvas.
- To add or replace a glyph, forge it through `design/STYLE.md` (Family B) and record it in the source
  `FOUNDRY.md` first, then copy it here and add a row above.
