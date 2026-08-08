import type { TextStyle } from 'react-native';

export const colors = {
  brand: {
    primary: '#F97316',
    primaryPressed: '#EA580C',
    anchorMid: '#F25A16',
    burnt: '#C2570A',
    energy: '#8B5CF6',
    energyAction: '#7C3AED',
    signatureOrange: '#F97316',
    signatureAmber: '#FBBF24',
    signatureMagenta: '#EC4899',
  },
  canvas: {
    contentTop: '#1A0F06',
    contentBottom: '#C2570A',
    detail: '#33200D',
    night: '#120C05',
    ivory: '#F4F1F5',
  },
  text: {
    primary: '#FFFFFF',
    secondary: 'rgba(255,248,240,0.72)',
    tertiary: 'rgba(255,248,240,0.56)',
    disabled: 'rgba(255,248,240,0.38)',
    ink: '#1A0F06',
    danger: '#EF4444',
  },
  icon: {
    primary: '#FFFFFF',
    inactive: 'rgba(255,255,255,0.68)',
    disabled: 'rgba(255,255,255,0.34)',
    dark: '#3B353D',
  },
  surface: {
    card: 'rgba(255,255,255,0.08)',
    cardElevated: 'rgba(255,255,255,0.12)',
    cardStrong: 'rgba(40,16,8,0.55)',
    sheet: '#33200D',
    sheetDeep: '#2A160A',
    light: '#FFFFFF',
    ivoryBlur: 'rgba(244,241,245,0.94)',
    scrim: 'rgba(18,12,5,0.64)',
    bannerScrimBottom: 'rgba(18,12,5,0.88)',
    bannerScrimTop: 'rgba(18,12,5,0.06)',
    divider: 'rgba(255,255,255,0.12)',
    track: 'rgba(255,255,255,0.34)',
    trackDark: 'rgba(255,255,255,0.14)',
  },
  semantic: {
    success: '#34C759',
    earn: '#22C55E',
    attention: '#F59E0B',
    danger: '#EF4444',
    dangerAction: '#B91C1C',
    info: '#3B82F6',
  },
  data: {
    amber: '#F59E0B',
    pink: '#EC4899',
    green: '#22C55E',
    blue: '#3B82F6',
  },
  heatmap: {
    met: '#EA580C',
    missed: 'rgba(255,255,255,0.10)',
    rest: 'rgba(255,248,240,0.22)',
    blank: 'rgba(255,255,255,0.04)',
  },
  asset: {
    clayIvory: '#F4F1F5',
    clayShade: '#C9C4CC',
    glyph: '#FFFFFF',
  },
} as const;

export const gradients = {
  homeHeat: {
    colors: ['#F98529', '#F97A22', '#F76D1C', '#F45C11', '#F44D09', '#F04205', '#EB2E02'],
    locations: [0, 0.15, 0.3, 0.44, 0.6, 0.72, 1],
  },
  content: {
    colors: [colors.canvas.contentTop, colors.canvas.contentBottom],
    locations: [0, 1],
  },
  detail: {
    colors: [colors.canvas.contentTop, colors.canvas.detail, '#6A2B08'],
    locations: [0, 0.72, 1],
  },
  night: {
    colors: [colors.canvas.night, colors.canvas.contentTop, '#5A2107'],
    locations: [0, 0.72, 1],
  },
  ivory: {
    colors: [colors.canvas.ivory, '#FFF8F0'],
    locations: [0, 1],
  },
  signature: {
    colors: [colors.brand.signatureOrange, colors.brand.signatureAmber, colors.brand.signatureMagenta],
    locations: [0, 0.52, 1],
  },
  bannerScrim: {
    colors: [colors.surface.bannerScrimTop, 'rgba(18,12,5,0.30)', colors.surface.bannerScrimBottom],
    locations: [0, 0.46, 1],
  },
} as const;

export const space = {
  0: 0,
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
  screenPadding: 20,
  screenPaddingCompact: 16,
  goalBarInset: 22,
  sectionGap: 24,
  cardGap: 12,
  rowGap: 8,
  conditionCardRatio: 2.21,
  maxContentWidth: 520,
  tabBarHeight: 58,
  minimumTarget: 44,
} as const;

export const radius = {
  xs: 8,
  sm: 12,
  actionRow: 14,
  card: 16,
  cardLarge: 20,
  condition: 24,
  sheet: 28,
  hero: 32,
  pill: 999,
} as const;

export const motion = {
  duration: { press: 100, fast: 150, standard: 220, slow: 300, sheet: 380, ring: 650 },
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
  screenLarge: text(34, 40, '700', -0.4),
  screenTitle: text(28, 34, '700', -0.2),
  sheetTitle: text(20, 24, '700'),
  sectionTitle: text(22, 28, '700', -0.1),
  cardTitle: text(17, 22, '600'),
  cardHeroTitle: text(24, 29, '700', -0.2),
  body: text(15, 21, '400'),
  bodyEmphasis: text(15, 21, '600'),
  callout: text(16, 21, '400'),
  statLabel: text(15, 20, '600'),
  statValue: { ...text(22, 26, '700', -0.2), fontVariant: ['tabular-nums'] } satisfies TextStyle,
  button: text(17, 22, '600'),
  label: text(13, 18, '600', 0.1),
  caption: text(12, 16, '400', 0.1),
  micro: text(10, 13, '700', 0.8),
  tab: text(12, 15, '500'),
} as const;

export const tokens = { colors, gradients, space, layout, radius, motion, type } as const;
