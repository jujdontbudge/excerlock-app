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
  /**
   * Decorative palette of the captain-approved condition-demo illustration. The
   * prototype deliberately uses soft white cards rather than the outlined-card
   * treatment. Reference: condition-demo/IMPLEMENTATION-PROMPT.md.
   */
  demo: {
    sky: ['#F2792C', '#F58E42', '#F9AE72'],
    farHill: '#F9C79A',
    nearHill: '#F6B583',
    ground: '#FBDCC1',
    path: '#FFF1E3',
    pebble: '#F4C79E',
    trunk: '#8A4A2B',
    tree: '#E8823F',
    treeLight: '#F0955B',
    map: '#F3EBDF',
    block: '#EADFCC',
    building: '#E4D5BE',
    park: '#DDE8C9',
    parkTree: '#CFE0B4',
    gym: '#F0B98C',
    location: '#2F7CF6',
    locationHalo: 'rgba(47,124,246,.18)',
    radius: 'rgba(201,71,16,.12)',
    treadmill: '#2B2E3A',
    belt: '#3E4252',
    beltTick: '#5A5F72',
    video: '#1b1b1f',
    videoSubject: '#3a3a44',
    avatar: '#6b6b73',
    black: '#000000',
    cyan: '#69C9D0',
    red: '#EE1D52',
    shadow: '0px 16px 36px rgba(120,50,10,.22)',
    tabInactive: 'rgba(255,255,255,0.6)',
  },
  /** O01–O03 intro compositions: tiles, tilts, third-party brand marks and decorative gradients. */
  welcome: {
    /** Gaps around the artwork on O01–O03, part of the approved composition rather than the spacing scale. */
    gap: { hero: 48, progress: 44, control: 20, dots: 20 },
    canvasWidth: 354,
    heroHeight: 244,
    control: {
      height: 156,
      /* Locked social apps sit above the activities; the arrow points from one to the other. */
      locked: { size: 54, radius: 15, badge: 22, badgeOffset: -6, gap: 14, veil: 'rgba(190,195,206,0.48)' },
      tileSize: 132,
      radius: 34,
      iconSize: 82,
      peach: '#FFE9D8',
      peachEnd: '#FFD0AA',
      orange: '#F67735',
      deep: '#DF4000',
      shadow: '0px 10px 14px rgba(93,54,31,0.14)',
      tiles: [
        { icon: 'person-walking', x: 31, y: 10, tilt: '-5deg', peach: true },
        { icon: 'dumbbell', x: 191, y: 10, tilt: '10deg', peach: false },
      ],
    },
    progress: {
      width: 354,
      height: 244,
      bars: [100, 156, 182, 156, 94, 154, 170],
      barWidth: 28,
      barGap: 15,
      barLeft: 29,
      barBottom: 216,
      barRadius: 3,
      pale: '#FCE6D9',
      orange: '#FF692C',
      deep: '#D63D00',
      curve: 'M8 32 C70 32 114 57 177 106 C238 161 291 187 346 194',
      curveLength: 410,
      stroke: 10,
      point: { x: 177, y: 106, size: 24, border: 5 },
      badge: {
        top: 151,
        minHeight: 56,
        icon: 50,
        arrow: 28,
        padding: 14,
        shadow: '0px 12px 20px rgba(132,64,18,0.15)',
      },
    },
    tile: {
      size: 80,
      radius: 23,
      badge: 30,
      badgeOffset: -8,
      shadow: '0px 5px 10px rgba(45,25,10,0.12)',
      blockedVeil: 'rgba(190,195,206,0.48)',
    },
    tiles: [
      { name: 'instagram', x: 10, y: 14, tilt: '-15deg' },
      { name: 'youtube', x: 94, y: 24, tilt: '13deg' },
      { name: 'whatsapp', x: 178, y: 12, tilt: '-14deg' },
      { name: 'tiktok', x: 264, y: 23, tilt: '13deg' },
    ] as const,
    /** Where the schedule card sits in the O01 composition; the card itself is UI chrome. */
    card: { x: 20, y: 82, width: 314 },
    brands: {
      instagram: ['#7935BD', '#D63589', '#FFAC55'],
      youtube: '#FF1509',
      whatsapp: '#63D769',
      tiktok: '#111114',
      cyan: '#25F4EE',
      pink: '#FE2C55',
      white: '#FFFFFF',
    },
  },
  /** The referral-source marks on O06, drawn at their own size. */
  referral: { size: 34, radius: 8, appStoreTop: '#27C6F2', appStoreBottom: '#1478F8', muted: '#9699A0' },
} as const;
