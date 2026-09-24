/** The loaded Baloo 2 faces. Weight is chosen by face, never by `fontWeight`. */
const font = {
  regular: 'Baloo2_400Regular',
  semibold: 'Baloo2_600SemiBold',
  bold: 'Baloo2_700Bold',
  extraBold: 'Baloo2_800ExtraBold',
} as const;
/** Normative design values. Geometry for illustrations is in SVG viewBox coordinates. */
export const tokens = {
  surface: {
    orangeGradient: ['#F6B583', '#FBE2CF', '#FFF7F1'],
    tabBarGradient: ['rgba(255,247,241,0)', 'rgba(255,247,241,0.92)', '#FFF7F1'],
    topTint: '#FFF0E5',
    topTintMid: '#FFF8F3',
    card: '#FFFFFF',
    glass: 'rgba(255,255,255,0.62)',
    subtle: '#F7F7F8',
    well: '#F2F2F7',
    selected: '#FFF1E8',
    scrim: 'rgba(29,29,34,0.32)',
    /** The orange status card and the lock body: one gradient, light to deep. */
    statusGradient: ['#F24A00', '#DC3700'],
    /** Veil over a screen that has just detected an unlock. */
    detected: 'rgba(239,76,0,0.88)',
    /** Progress tracks drawn on an orange fill. */
    onAccentTrack: 'rgba(255,255,255,0.3)',
    transparent: 'transparent',
  },
  text: {
    primary: '#1D1D22',
    secondary: '#66666F',
    onAccent: '#FFFFFF',
  },
  brand: {
    lockHighlight: '#FF6414',
    lockShade: '#E84000',
    lockShadow: '#743510',
    primary: '#C94710',
    pressed: '#AE380A',
    decorative: '#F47735',
    light: '#FFD6BD',
    /** Unfilled part of the onboarding step bar. */
    track: '#FCE5DA',
  },
  /** `mutedStroke` is for non-text strokes, dividers and inactive glyphs only; it fails AA as text. */
  border: {
    divider: '#E5E5EA',
    selected: '#C94710',
    outline: '#1D1D22',
    mutedStroke: '#767680',
    /** Hairline on an orange fill. */
    onAccent: 'rgba(255,255,255,0.4)',
  },
  state: {
    switchOn: '#34C759',
    disabledFill: '#EEEEF1',
    disabledText: '#909099',
    success: '#27834A',
    error: '#BD3038',
  },
  chart: {
    exercise: '#C94710', comparison: '#92929C', grid: '#ECECEF',
    ringBase: '#D9531B', ringMid: '#E45E25', ringOverflow: '#EF6B32', ringEndpoint: '#FF7A3D',
    ringEndpointShadow: 'rgba(116,53,16,0.34)',
  },
  /** Pastel fills for decorative discs and app tiles; never text or icon tints. */
  swatch: {
    mint: '#9FE1C3',
    lilac: '#C9B8F5',
    sky: '#9CCBFF',
    coral: '#FF8A80',
    yellow: '#FFD466',
  },
  font,
  // Eight roles across six sizes. lineHeight = ceil(size x 1.40) for text and
  // ceil(size x 1.20) for digit-only roles: the smallest factors that clear
  // Baloo 2's clip floor at every weight (see guardrails/design-system.test.ts).
  type: {
    metric: { fontSize: 48, lineHeight: 58, fontFamily: font.bold },
    display: { fontSize: 30, lineHeight: 42, fontFamily: font.extraBold },
    metricSmall: { fontSize: 30, lineHeight: 36, fontFamily: font.bold },
    section: { fontSize: 22, lineHeight: 31, fontFamily: font.bold },
    body: { fontSize: 18, lineHeight: 26, fontFamily: font.regular },
    label: { fontSize: 18, lineHeight: 26, fontFamily: font.semibold },
    support: { fontSize: 14, lineHeight: 20, fontFamily: font.regular },
    micro: { fontSize: 12, lineHeight: 17, fontFamily: font.semibold },
  },
  space: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    xxl: 32,
  },
  /** pill: fixed-height controls. card: content containers. field: inputs and surfaces nested in a card. sheet: bottom-sheet top corners. */
  radius: { card: 20, field: 16, sheet: 28, pill: 999 },
  /** full: full-width buttons and fields. inline: chips, segments, icon buttons, tab items. indicator: non-tappable badges. row: list rows only. */
  control: { full: 56, inline: 44, indicator: 32, row: 68 },
  icon: { sm: 16, md: 24, lg: 36 },
  stroke: { hairline: 1, selected: 1.5, chart: 3, glyph: 3 },
  layout: {
    page: 24,
    logo: 140,
    wash: 220,
    washMid: 96,
    fieldMax: 220,
    tabHeight: 49,
    chartHeight: 170,
    cardWidth: 171,
    sheetMax: 0.88,
    grabber: 40,
    progress: 6,
    thumb: 28,
    ring: 96,
    dot: 8,
    maxWidth: 600,
    prompt: 300,
    header: 60,
    stepBar: 8,
    statusCard: 154,
  },
  shadow: {
    cta: '0px 4px 12px rgba(0,0,0,0.08)',
    status: '0px 14px 22px rgba(132,64,18,0.20)',
    control: '0px 3px 10px rgba(0,0,0,0.13)',
  },
  /** Map overlays: the picker's pin and radius ring, and the unlock screen's geofence. */
  map: {
    pin: { size: 22, border: 4, lift: 6, scale: 1.05 },
    ring: { stroke: 2, dim: 'rgba(29,29,34,0.16)', fill: 'rgba(244,119,53,0.08)' },
    geofence: 'rgba(239,76,0,0.18)',
  },
  a11y: { textScale: 2 },
  /** Baloo 2's deep descent (0.524em) lifts a single centred line; nudge it down by this share of its size. */
  optical: { centre: 0.27 },
  motion: {
    /** Four durations: press feedback, UI change, emphasized entrance, and the ambient breathing loop. */
    duration: { press: 100, standard: 240, emphasized: 480, breathe: 3600 },
    easing: {
      standard: [0.2, 0, 0, 1],
      enter: [0.16, 1, 0.3, 1],
    },
    spring: {
      control: { mass: 0.55, stiffness: 420, damping: 30 },
      pop: { mass: 0.8, stiffness: 240, damping: 15 },
    },
    stagger: { list: 40, hero: 90, dot: 16 },
    distance: { enter: 16, hero: 24, float: 4, dismiss: 120 },
    scale: { pressed: 0.97, pop: 0.9, selected: 1.02 },
    velocity: { dismiss: 800 },
  },
} as const;
