/**
 * Colour tokens, ported from `design/pillow-style-guide.md` §2 with the accents
 * fixed by ticket #36 (`#F98529` / `#EB2E02` — the head and tail of the approved
 * dashboard gradient). Nothing here knows about a component.
 */
export const colors = {
  /** Background system: near-black warm umber flowing into burnt orange. */
  bgTop: "#1A0F06",
  bgBottom: "#C2570A",
  bgDetail: "#33200D",
  bgNight: "#120C05",

  /** Primary chrome: pills, selected states, the active tab. */
  primary: "#F98529",
  primaryPressed: "#EB2E02",
  onPrimary: "#FFFFFF",

  /** Reserved for urgency / claim-and-boost moments. Never primary chrome. */
  energy: "#8B5CF6",

  /** Translucent, borderless cards — hierarchy comes from layering, not strokes. */
  card: "rgba(255, 255, 255, 0.08)",
  cardElevated: "rgba(255, 255, 255, 0.12)",

  /** The big screen-level action sits in a solid white pill with near-black ink. */
  pillScreenCta: "#FFFFFF",
  onPillScreenCta: "#160C04",
  pillSecondary: "rgba(255, 255, 255, 0.10)",

  textPrimary: "#FFFFFF",
  textSecondary: "rgba(255, 248, 240, 0.6)",
  textTertiary: "rgba(255, 248, 240, 0.4)",

  success: "#34C759",
  danger: "#EF4444",
} as const;

/** Categorical data colours for charts — bright on dark, one hue per earn type. */
export const dataColors = {
  amber: "#F59E0B",
  pink: "#EC4899",
  green: "#22C55E",
  blue: "#3B82F6",
} as const;

/** Widened so a theme override may supply any colour for a token. */
export type Colors = { readonly [K in keyof typeof colors]: string };
