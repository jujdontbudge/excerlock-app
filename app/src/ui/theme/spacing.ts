/** A 4pt scale. `gutter` is the 16pt side margin every screen keeps. */
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  gutter: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

/** Nothing in ExcerLock is unrounded — the minimum corner is 12. */
export const radius = {
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  pill: 999,
} as const;

export type Spacing = { readonly [K in keyof typeof spacing]: number };
export type Radius = { readonly [K in keyof typeof radius]: number };
