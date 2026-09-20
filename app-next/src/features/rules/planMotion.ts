/** Milliseconds measured against the Pep AI replay; presentation, not server progress. */
export const PLAN_MOTION = { count: 6000, ready: 6000, burst: 0, covered: 180, fade: 360, done: 520 } as const;
/** Loading-ring geometry shared with the celebration, so the check lands exactly on the ring. */
export const PLAN_RING = { size: 224, radius: 96, stroke: 16, topFraction: 0.14, checkSize: 72 } as const;
/** Distance from a window top to the ring's centre, given the safe-area inset the shell applies. */
export const planRingCenterY = (height: number, insetTop: number) =>
  insetTop + height * PLAN_RING.topFraction + PLAN_RING.size / 2;
function clamp(n: number) { 'worklet'; return Math.max(0, Math.min(1, n)); }
function smooth(n: number) { 'worklet'; const x = clamp(n); return x * x * (3 - 2 * x); }
export function taskMotion(index: number, elapsed: number) {
  'worklet';
  let shifted = 0;
  for (let i = 0; i < index; i++) shifted += smooth((elapsed - (i * 1000 + 900)) / 350);
  return {
    checked: elapsed >= index * 1000 + 600,
    exit: smooth((elapsed - (index * 1000 + 900)) / 300),
    slot: index - shifted,
  };
}
