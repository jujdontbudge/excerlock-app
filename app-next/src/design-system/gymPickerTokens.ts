import { tokens as t } from './tokens';
export const gymPickerTokens = {
  map: { minHeight: 340, maxHeight: 420, screenFraction: 0.44 },
  pin: { size: 22, border: 4, lift: 6, scale: 1.05 },
  ring: { stroke: 2, dim: 'rgba(29,29,34,0.16)', fill: 'rgba(244,119,53,0.08)' },
  card: { padding: t.space.lg, radius: t.radius.sheet },
} as const;
