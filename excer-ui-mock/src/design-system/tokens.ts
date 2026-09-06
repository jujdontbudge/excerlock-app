import type { TextStyle } from 'react-native';

export const colors = {
  brand: {
    primary: '#3445E6',
    primaryPressed: '#2A38C2',
    anchorMid: '#303BC4',
    burnt: '#25309A',
    energy: '#5B67F2',
    energyAction: '#4453E5',
    signatureOrange: '#3445E6',
    signatureAmber: '#6875FF',
    signatureMagenta: '#25206F',
  },
  canvas: {
    contentTop: '#211C68',
    contentBottom: '#3445E6',
    detail: '#252A78',
    night: '#14183F',
    ivory: '#F3F5FF',
  },
  text: {
    primary: '#FFFFFF',
    secondary: '#FFFFFF',
    tertiary: '#FFFFFF',
    disabled: 'rgba(247,248,255,0.40)',
    placeholder: 'rgba(255,255,255,0.72)',
    ink: '#FFFFFF',
    onLight: '#111633',
    danger: '#EF4444',
  },
  icon: {
    primary: '#FFFFFF',
    inactive: '#FFFFFF',
    disabled: 'rgba(255,255,255,0.34)',
    dark: '#3B353D',
  },
  surface: {
    card: 'transparent',
    cardElevated: 'rgba(255,255,255,0.10)',
    cardStrong: 'rgba(255,255,255,0.13)',
    bubble: 'rgba(255,255,255,0.10)',
    bubbleStrong: 'rgba(255,255,255,0.13)',
    bubbleBorder: 'rgba(255,255,255,0.18)',
    field: 'rgba(255,255,255,0.10)',
    fieldFocused: 'rgba(255,255,255,0.30)',
    mediaScrim: 'rgba(10,14,44,0.70)',
    sheet: '#252A78',
    sheetDeep: '#191E58',
    light: '#FFFFFF',
    ivoryBlur: 'rgba(243,245,255,0.94)',
    scrim: 'rgba(10,14,44,0.10)',
    bannerScrimBottom: 'rgba(10,14,44,0.90)',
    bannerScrimTop: 'rgba(10,14,44,0.06)',
    divider: 'rgba(247,248,255,0.22)',
    track: 'rgba(255,255,255,0.34)',
    trackDark: 'rgba(255,255,255,0.14)',
  },
  semantic: {
    success: '#34C759',
    earn: '#22C55E',
    attention: '#6680FF',
    danger: '#EF4444',
    dangerAction: '#B91C1C',
    info: '#3B82F6',
  },
  data: {
    amber: '#6680FF',
    pink: '#EC4899',
    green: '#22C55E',
    blue: '#3B82F6',
  },
  heatmap: {
    met: '#3445E6',
    missed: 'rgba(255,255,255,0.10)',
    rest: 'rgba(247,248,255,0.22)',
    blank: 'rgba(255,255,255,0.04)',
  },
  asset: {
    clayIvory: '#F3F5FF',
    clayShade: '#C6CAE0',
    glyph: '#FFFFFF',
  },
} as const;

const homeHeatGradient = {
  colors: ['#211C68', '#232173', '#262781', '#292E93', '#2D35AA', '#303DC7', '#3445E6'],
  locations: [0, 0.16, 0.32, 0.48, 0.64, 0.82, 1],
} as const;

export const gradients = {
  homeHeat: homeHeatGradient,
  content: homeHeatGradient,
  detail: homeHeatGradient,
  night: homeHeatGradient,
  ivory: homeHeatGradient,
  signature: {
    colors: [colors.brand.signatureOrange, colors.brand.signatureAmber, colors.brand.signatureMagenta],
    locations: [0, 0.52, 1],
  },
  bannerScrim: {
    colors: [colors.surface.bannerScrimTop, 'rgba(10,14,44,0.32)', colors.surface.bannerScrimBottom],
    locations: [0, 0.46, 1],
  },
  contentMask: {
    colors: ['rgba(255,255,255,0)', 'rgba(255,255,255,0.12)', 'rgba(255,255,255,0.72)', '#FFFFFF'],
    locations: [0, 0.46, 0.78, 1],
  },
} as const;

export const space = {
  0: 0,
  optical: 2,
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  7: 28,
  8: 32,
  10: 40,
  12: 48,
  14: 56,
  16: 64,
  20: 80,
} as const;

export const layout = {
  referenceWidth: 393,
  referenceHeight: 852,
  screenPadding: 24,
  screenPaddingCompact: 16,
  goalBarInset: 22,
  sectionGap: 32,
  cardGap: 12,
  rowGap: 8,
  conditionCardRatio: 2.21,
  maxContentWidth: 520,
  tabBarHeight: 49,
  tabBarContentInset: 140,
  minimumTarget: 44,
  headerHeight: 56,
  controlHeight: 56,
  controlHeightCompact: 48,
  rowHeight: 60,
  largeFieldHeight: 112,
  supportHeaderInset: 112,
  floatingFooterContentInset: 160,
} as const;

/** Optical sizes for functional icons after SVG view-box normalization. */
export const iconSize = {
  inline: 18,
  compact: 20,
  standard: 24,
  action: 28,
  feature: 40,
  hero: 80,
} as const;

export const radius = {
  xs: 8,
  sm: 12,
  actionRow: 14,
  control: 18,
  card: 20,
  cardLarge: 20,
  condition: 24,
  sheet: 28,
  hero: 32,
  pill: 999,
} as const;

export const motion = {
  duration: { press: 100, fast: 180, standard: 240, slow: 300, sheet: 300, ring: 650 },
  ease: {
    standard: 'cubic-bezier(0.20, 0, 0, 1)',
    enter: 'cubic-bezier(0.16, 1, 0.30, 1)',
    exit: 'cubic-bezier(0.40, 0, 1, 1)',
  },
  spring: {
    control: { mass: 0.55, stiffness: 420, damping: 30 },
    card: { mass: 0.75, stiffness: 300, damping: 26 },
    sheet: { mass: 1, stiffness: 250, damping: 28 },
    celebrate: { mass: 0.8, stiffness: 240, damping: 15 },
  },
} as const;

const systemFont = 'System';

function text(size: number, lineHeight: number, fontWeight: TextStyle['fontWeight'], letterSpacing = 0): TextStyle {
  return { fontFamily: systemFont, fontSize: size, lineHeight, fontWeight, letterSpacing };
}

export const type = {
  heroXl: { ...text(96, 100, '300', -1.5), fontVariant: ['tabular-nums'] } satisfies TextStyle,
  heroLg: { ...text(72, 78, '300', -1), fontVariant: ['tabular-nums'] } satisfies TextStyle,
  heroMd: { ...text(48, 54, '400', -0.5), fontVariant: ['tabular-nums'] } satisfies TextStyle,
  screenLarge: text(32, 38, '700', -0.35),
  screenTitle: text(28, 34, '700', -0.2),
  navigationTitle: text(22, 28, '700', -0.1),
  sheetTitle: text(22, 28, '700', -0.1),
  sectionTitle: text(22, 28, '700', -0.1),
  cardTitle: text(17, 22, '600'),
  cardHeroTitle: text(24, 29, '700', -0.2),
  body: text(16, 22, '400'),
  bodyEmphasis: text(16, 22, '600'),
  callout: text(17, 23, '400'),
  statLabel: text(15, 20, '600'),
  statValue: { ...text(22, 26, '700', -0.2), fontVariant: ['tabular-nums'] } satisfies TextStyle,
  button: text(17, 22, '600'),
  readerBody: text(18, 28, '400'),
  readerHeading: text(22, 29, '700', -0.1),
  readerTitle: text(34, 40, '700', -0.4),
  label: text(13, 18, '600', 0.1),
  caption: text(12, 16, '400', 0.1),
  micro: text(10, 13, '700', 0.8),
  tab: text(12, 15, '500'),
} as const;

export const tokens = { colors, gradients, iconSize, space, layout, radius, motion, type } as const;
