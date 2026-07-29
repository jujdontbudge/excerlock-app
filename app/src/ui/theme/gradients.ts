import { colors } from "./colors";

export type Gradient = {
  /** At least two stops — a gradient with one colour is a flat fill. */
  readonly colors: readonly [string, string, ...string[]];
  readonly locations: readonly [number, number, ...number[]];
  readonly start: { readonly x: number; readonly y: number };
  readonly end: { readonly x: number; readonly y: number };
};

const VERTICAL = { start: { x: 0.5, y: 0 }, end: { x: 0.5, y: 1 } } as const;

/**
 * Every ExcerLock surface is a full-bleed vertical gradient — never flat, never
 * pure black.
 *
 * - `screen` is the background system named by ticket #36: the style guide's
 *   `bg-top` → `bg-bottom`. It is the default for every surface.
 * - `dashboard` is the seven-stop gradient sampled from the approved dashboard
 *   mockup (`docs/codex-dashboard-ui-build-spec.md` §2) and reserved for the
 *   Home dashboard once the condition cards land.
 * - `night` backs live lock/shield screens.
 */
export const gradients = {
  screen: {
    colors: [colors.bgTop, "#5E2A06", colors.bgBottom],
    locations: [0, 0.55, 1],
    ...VERTICAL,
  },
  dashboard: {
    colors: ["#F98529", "#F97A22", "#F76D1C", "#F45C11", "#F44D09", "#F04205", "#EB2E02"],
    locations: [0, 0.15, 0.3, 0.44, 0.6, 0.72, 1],
    ...VERTICAL,
  },
  night: {
    colors: [colors.bgNight, colors.bgDetail],
    locations: [0, 1],
    ...VERTICAL,
  },
} as const satisfies Record<string, Gradient>;

export type GradientName = keyof typeof gradients;
export type Gradients = { readonly [K in GradientName]: Gradient };
