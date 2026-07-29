import { Platform, type TextStyle } from "react-native";

import { colors } from "./colors";

/**
 * SF Pro for everything, SF Pro Rounded for hero numerals.
 *
 * `rounded` names the iOS system rounded face directly. Where the platform
 * cannot resolve it the text falls back to the system face at the same metrics,
 * which is a graceful degradation but not the real thing — shipping true SF
 * Rounded needs an `expo-font` asset, tracked as a follow-up on ticket #36.
 */
export const fonts = {
  system: Platform.select({ web: '-apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif', default: "System" }) as string,
  rounded: Platform.select({ web: '"SF Pro Rounded", -apple-system, sans-serif', default: "SF Pro Rounded" }) as string,
} as const;

const TABULAR: TextStyle["fontVariant"] = ["tabular-nums"];

export const typography = {
  fonts,

  /** Balance countdowns and clock faces. */
  hero: {
    fontFamily: fonts.rounded,
    fontSize: 76,
    fontWeight: "300",
    lineHeight: 84,
    color: colors.textPrimary,
    fontVariant: TABULAR,
  },
  /** The tiny unit suffix that rides beside a hero numeral. */
  heroSuffix: {
    fontFamily: fonts.rounded,
    fontSize: 17,
    fontWeight: "500",
    color: colors.textPrimary,
  },
  screenTitle: {
    fontFamily: fonts.system,
    fontSize: 34,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  /** In-content heading: empty states, card groups, sheet sections. */
  title: {
    fontFamily: fonts.system,
    fontSize: 24,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  sheetTitle: {
    fontFamily: fonts.system,
    fontSize: 17,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  cardTitle: {
    fontFamily: fonts.system,
    fontSize: 17,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  body: {
    fontFamily: fonts.system,
    fontSize: 15,
    fontWeight: "400",
    lineHeight: 21,
    color: colors.textSecondary,
  },
  /** Section headers and labels — 13pt, uppercase where it heads a group. */
  caption: {
    fontFamily: fonts.system,
    fontSize: 13,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  /** Timers and counters never jitter. */
  numeric: {
    fontFamily: fonts.system,
    fontSize: 22,
    fontWeight: "700",
    color: colors.textPrimary,
    fontVariant: TABULAR,
  },
} as const satisfies Record<string, TextStyle | typeof fonts>;

export type Fonts = { readonly [K in keyof typeof fonts]: string };
export type TextStyleName = Exclude<keyof typeof typography, "fonts">;
export type Typography = Readonly<
  Record<TextStyleName, TextStyle> & { fonts: Fonts }
>;
