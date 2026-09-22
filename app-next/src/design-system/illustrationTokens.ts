import { tokens as t } from './tokens';
/**
 * Illustration-only values: geometry and lettering inside artwork, such as the
 * miniature phones of the condition demo and the plan preview. These are drawn
 * to scale with the picture, not read as UI, so they sit outside the type
 * roles. UI chrome may not import this module (guardrails/design-system.test.ts).
 */
export const illustrationTokens = {
  /** Standalone pictograms: artwork drawn with icon glyphs, above the UI icon scale. */
  pictogram: { card: 64, hero: 112 },
  /** Padlock artwork proportions, as fractions of the padlock's width. */
  padlock: { bodyRadius: 0.13, bodyInset: 6, homeBodyRadius: 0.16, shackleRadius: 0.31 },
  /** Corner radii inside artwork: miniature phones and the cards pinned to the demo scene. */
  corner: { phone: 26, previewPhone: 40, previewScreen: 34, blob: 40, tile: 20, glyph: 3, info: 18, caption: 14 },
  /** Lettering inside a miniature phone, drawn at the phone's scale. */
  miniature: {
    glyph: { fontSize: 20, fontFamily: t.font.regular },
    count: { fontSize: 7, fontFamily: t.font.regular },
    tab: { fontSize: 7, fontFamily: t.font.bold },
    status: { fontSize: 10, fontFamily: t.font.semibold },
    button: { fontSize: 10.5, fontFamily: t.font.semibold },
    wordmark: { fontSize: 15, fontFamily: t.font.bold },
    percent: { fontSize: 18, fontFamily: t.font.bold },
    shieldTitle: { fontSize: 11.5, lineHeight: 16, fontFamily: t.font.bold },
    shieldBody: { fontSize: 9, lineHeight: 13, fontFamily: t.font.regular },
    title: { fontSize: 12, lineHeight: 17, fontFamily: t.font.bold },
    body: { fontSize: 9.5, lineHeight: 14, fontFamily: t.font.regular },
  },
  /** Fixed-size labels pinned to the condition-demo scene; they never scale with text size. */
  scene: {
    caption: { fontSize: 12, lineHeight: 17, fontFamily: t.font.semibold },
    value: { fontSize: 16, lineHeight: 20, fontFamily: t.font.bold },
    title: { fontSize: 13, lineHeight: 19, fontFamily: t.font.semibold },
    body: { fontSize: 12, lineHeight: 17, fontFamily: t.font.regular },
  },
} as const;
