export const PLAN_MOTION = {
  count: 6000,
  ready: 6000,
  hold: 140,
  fadeout: 130,
  buildDone: 6270,
  gap: 70,
  badgeIn: 280,
  burst: 600,
  covered: 900,
  reveal: 1070,
  done: 1370,
} as const;
export const PLAN_RING = { size: 224, radius: 96, stroke: 16, topFraction: 0.14 } as const;
export const PLAN_BADGE = { size: 80, coin: 48, glyph: 36, ripple: 300 } as const;
function clamp(n: number) { 'worklet'; return Math.max(0, Math.min(1, n)); }
export function smooth(n: number) { 'worklet'; const x = clamp(n); return x * x * (3 - 2 * x); }
export function planPercentLabel(value: number) {
  'worklet';
  return `${Math.max(0, Math.min(100, Math.round(value)))}%`;
}
export function taskMotion(index: number, elapsed: number) {
  'worklet';
  let shifted = 0;
  for (let i = 0; i < index; i++) shifted += smooth((elapsed - (i * 1000 + 520)) / 320);
  const exit = smooth((elapsed - (index * 1000 + 400)) / 260);
  return {
    checked: elapsed >= Math.max(index * 1000, 150),
    exit,
    swipeX: exit * (index % 2 === 0 ? -28 : 28),
    slot: index - shifted,
  };
}
