/** Milliseconds measured against the Pep AI replay; presentation, not server progress. */
export const PLAN_MOTION = { count: 6000, ready: 6000, burst: 0, covered: 650, fade: 900, done: 1200 } as const;
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
