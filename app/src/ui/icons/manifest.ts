import type { ImageSourcePropType } from "react-native";

/** `[left, top, right, bottom]` alpha bounding box inside the 1024² source PNG. */
type Crop = readonly [number, number, number, number];

/**
 * Family-B white-glyph assets harvested from the frozen prototype
 * (`prototype/assets/icons/`, generated through `design/STYLE.md` §Family B) and
 * copied into `app/assets/icons/`. They ship white and are tinted at render.
 *
 * The crops are the alpha bounding boxes measured by the prototype — the foundry
 * pads every glyph inside its 1024² field, so drawing the raw PNG at tab size
 * yields a glyph half the intended weight.
 *
 * Tab mapping is PROVISIONAL. `design/mockups/tabbar-4plain-v1.png` calls for a
 * house, sliders, bar chart and gear; only the bar chart exists today, so the
 * rest borrow the nearest shipped glyph. Replacing them is an icon-foundry
 * follow-up on ticket #36 — swap the three sources here and nothing else moves.
 */
export const glyphs = {
  /** Prototype's centre "home" tab glyph. */
  home: {
    source: require("../../../assets/icons/icon-tab-spiral.png") as ImageSourcePropType,
    crop: [148, 152, 876, 842] as Crop,
  },
  /** Stand-in for the mockup's sliders — edit/manage reads closest. */
  manage: {
    source: require("../../../assets/icons/icon-pencil.png") as ImageSourcePropType,
    crop: [150, 122, 892, 866] as Crop,
  },
  /** Exact match to the mockup's Analysis tab. */
  analysis: {
    source: require("../../../assets/icons/icon-tab-chart.png") as ImageSourcePropType,
    crop: [167, 173, 856, 847] as Crop,
  },
  /** Stand-in for the mockup's gear — no gear glyph has been forged yet. */
  settings: {
    source: require("../../../assets/icons/icon-info.png") as ImageSourcePropType,
    crop: [124, 116, 892, 900] as Crop,
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
