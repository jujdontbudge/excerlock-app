import { tokens as t } from './tokens';
/** O04–O06 geometry sampled from the approved question mockups; surfaces follow the app-wide outline style. */
export const profileTokens = {
  title: { fontSize: 28, lineHeight: 35, fontWeight: '700' },
  largeTitle: { fontSize: 30, lineHeight: 38, fontWeight: '700' },
  support: { fontSize: 16, lineHeight: 22 },
  rowType: { fontSize: 16, lineHeight: 22, fontWeight: '400' },
  row: { height: 68, referralHeight: 72, radius: 20, gap: 12, horizontal: 16, vertical: 16 },
  radio: { size: 32, dot: 12 },
  icon: { size: 34, radius: 8 },
  field: { height: 64, radius: 16 },
  header: { height: 60, bar: 8, arrow: 28, arrowStroke: 3 },
  buttonRadius: 18,
  colors: {
    line: t.border.outline,
    selected: '#FFF3ED',
    selectedLine: '#FFC4AA',
    track: '#FCE5DA',
    row: t.surface.card,
    referral: t.surface.card,
    appStoreTop: '#27C6F2',
    appStoreBottom: '#1478F8',
    muted: '#9699A0',
  },
} as const;
