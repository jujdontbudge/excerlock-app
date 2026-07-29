import type { ImageSourcePropType } from "react-native";

/** `[left, top, right, bottom]` alpha bounding box inside the 1024² source PNG. */
type Crop = readonly [number, number, number, number];

/**
 * Family-B white-glyph assets harvested from the frozen prototype
 * (`prototype/assets/icons/`, generated through `design/STYLE.md` §Family B) and
 * copied into `app/assets/icons/`. They ship white and are tinted at render.
 *
 * The crops are alpha bounding boxes in the foundry's 1024² coordinate space —
 * every glyph is padded inside that field, so drawing the raw PNG at tab size
 * yields a glyph half the intended weight. The shipped PNGs are downsized to
 * 512²; `Glyph` stretches them back into 1024-space, so crops stay in 1024
 * coordinates regardless of the file's native resolution.
 *
 * Tab glyphs match `design/mockups/tabbar-4plain-v1.png`: house, sliders, bar
 * chart, gear (house/sliders/gear forged on ticket #41 — see
 * `app/assets/icons/FOUNDRY.md`).
 */
export const glyphs = {
  home: {
    source: require("../../../assets/icons/icon-tab-house.png") as ImageSourcePropType,
    crop: [125, 160, 899, 837] as Crop,
  },
  manage: {
    source: require("../../../assets/icons/icon-tab-sliders.png") as ImageSourcePropType,
    crop: [168, 231, 857, 795] as Crop,
  },
  analysis: {
    source: require("../../../assets/icons/icon-tab-chart.png") as ImageSourcePropType,
    crop: [167, 173, 856, 847] as Crop,
  },
  settings: {
    source: require("../../../assets/icons/icon-tab-gear.png") as ImageSourcePropType,
    crop: [180, 174, 844, 850] as Crop,
  },
  lock: {
    source: require("../../../assets/icons/icon-padlock-chip.png") as ImageSourcePropType,
    crop: [362, 324, 662, 701] as Crop,
  },
  arrowRight: {
    source: require("../../../assets/icons/icon-arrow-right.png") as ImageSourcePropType,
    crop: [128, 254, 910, 770] as Crop,
  },
} as const;

export type GlyphName = keyof typeof glyphs;
