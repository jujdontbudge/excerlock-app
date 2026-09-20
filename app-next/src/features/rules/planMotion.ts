/** Milliseconds measured against the reference replay; presentation, not server progress. */
export const PLAN_MOTION = {
  count: 6000,
  ready: 6000,
  hold: 140,
  fadeout: 130,
  buildDone: 6270,
  gap: 70,
  badgeIn: 280,
  burst: 950,
  covered: 1250,
  reveal: 1420,
  done: 1720,
} as const;
/** Loading-ring geometry on the build screen. */
export const PLAN_RING = { size: 224, radius: 96, stroke: 16, topFraction: 0.14 } as const;
/** Celebration badge at the screen centre: disc, white coin and check glyph sizes. */
export const PLAN_BADGE = { size: 80, coin: 48, glyph: 36, ripple: 300 } as const;
function clamp(n: number) { 'worklet'; return Math.max(0, Math.min(1, n)); }
export function smooth(n: number) { 'worklet'; const x = clamp(n); return x * x * (3 - 2 * x); }
/**
 * Each pill fades out exactly where it sits once its check has filled, and the stack
 * closes the gap behind it; the reference replay never flings a pill across the screen.
 */
export function taskMotion(index: number, elapsed: number) {
  'worklet';
  let shifted = 0;
  for (let i = 0; i < index; i++) shifted += smooth((elapsed - (i * 1000 + 550)) / 300);
  return {
    checked: elapsed >= Math.max(index * 1000, 150),
    exit: smooth((elapsed - (index * 1000 + 400)) / 130),
    slot: index - shifted,
  };
}
