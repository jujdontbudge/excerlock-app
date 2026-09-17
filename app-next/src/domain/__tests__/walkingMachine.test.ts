import { createWalkingState, reduceWalking, walkingRelief } from '../walkingMachine';
const start = createWalkingState(0);
const evidence = (at: number, qualifying: boolean | 'unknown') => ({ kind: 'evidence' as const, at, qualifying });
const tick = { kind: 'tick' as const };
const active = () => reduceWalking(reduceWalking(start, evidence(0, true), 0, 30000), evidence(3000, true), 3000, 30000);
test('continuous qualifying evidence needs three seconds', () => {
  const verifying = reduceWalking(start, evidence(0, true), 0, 30000);
  expect(verifying.phase).toBe('verifying');
  expect(reduceWalking(verifying, tick, 2999, 30000).phase).toBe('verifying');
  expect(reduceWalking(verifying, tick, 3000, 30000)).toMatchObject({ phase: 'active', activeSince: 3000 });
});
test('interrupted verification starts a new three-second interval', () => {
  let s = reduceWalking(start, evidence(0, true), 0, 30000);
  s = reduceWalking(s, evidence(2000, false), 2000, 30000);
  s = reduceWalking(s, evidence(2500, true), 2500, 30000);
  expect(reduceWalking(s, tick, 5499, 30000).phase).toBe('verifying');
  expect(reduceWalking(s, tick, 5500, 30000).phase).toBe('active');
});
test('stop grace applies once; repeated negatives cannot extend it', () => {
  let s = reduceWalking(active(), evidence(4000, false), 4000, 30000);
  expect(s.graceEndsAt).toBe(34000);
  expect(walkingRelief(s)).toBe(true);
  s = reduceWalking(s, evidence(24000, false), 24000, 30000);
  expect(s.graceEndsAt).toBe(34000);
  expect(reduceWalking(s, tick, 33999, 30000).phase).toBe('grace');
  expect(reduceWalking(s, tick, 34000, 30000).phase).toBe('inactive');
});
test('silence starts grace at actual freshness deadline, not late wake time', () => {
  const s = active();
  expect(reduceWalking(s, tick, 7999, 30000).phase).toBe('active');
  expect(reduceWalking(s, tick, 8000, 30000)).toMatchObject({ phase: 'grace', graceEndsAt: 38000 });
  expect(reduceWalking(s, tick, 60000, 30000).phase).toBe('inactive');
});
test('unknown is a single negative observation, not perpetual relief', () => {
  const s = reduceWalking(active(), evidence(4000, 'unknown'), 4000, 30000);
  expect(s.graceEndsAt).toBe(34000);
  expect(reduceWalking(s, evidence(30000, 'unknown'), 40000, 30000).phase).toBe('inactive');
});
test('new positive evidence during grace resumes immediately, after expiry must requalify', () => {
  const stopped = reduceWalking(active(), evidence(4000, false), 4000, 30000);
  expect(reduceWalking(stopped, evidence(20000, true), 20000, 30000)).toMatchObject({ phase: 'active', activeSince: 3000 });
  expect(reduceWalking(stopped, evidence(40000, true), 40000, 30000)).toMatchObject({ phase: 'verifying', activeSince: null });
});
test('clock rewind and old evidence cannot revive expired state', () => {
  const expired = reduceWalking(active(), tick, 60000, 30000);
  const replay = reduceWalking(expired, evidence(4000, true), 5000, 30000);
  expect(replay.phase).toBe('inactive');
  expect(replay.watermark).toBe(60000);
});
test('negative wins conflicting same timestamp without restarting grace', () => {
  const positive = reduceWalking(active(), evidence(4000, true), 4000, 30000);
  const negative = reduceWalking(positive, evidence(4000, false), 4000, 30000);
  expect(negative.phase).toBe('grace');
  expect(reduceWalking(negative, evidence(4000, true), 4000, 30000)).toEqual(negative);
});
test('long suspended verifying gap does not manufacture sustained walking', () => {
  const verifying = reduceWalking(start, evidence(0, true), 0, 30000);
  expect(reduceWalking(verifying, evidence(10000, true), 10000, 30000).phase).toBe('verifying');
});
test('repeated tick is idempotent and input remains immutable', () => {
  const s = active();
  const snapshot = JSON.stringify(s);
  const next = reduceWalking(s, tick, 10000, 30000);
  expect(reduceWalking(next, tick, 10000, 30000)).toEqual(next);
  expect(JSON.stringify(s)).toBe(snapshot);
});
test('user grace clamped by validated domain range; future evidence rejected', () => {
  expect(() => reduceWalking(start, tick, 0, 29999)).toThrow();
  expect(() => reduceWalking(start, tick, 0, 300001)).toThrow();
  expect(() => reduceWalking(start, evidence(1000, true), 0, 30000)).toThrow();
  expect(() => reduceWalking(start, tick, NaN, 30000)).toThrow();
});

test('corrupt persisted active state without evidence cannot hold relief indefinitely', () => {
  expect(() => reduceWalking({ ...active(), lastEvidenceAt: null }, tick, 60000, 30000)).toThrow(/persisted/);
  expect(() => reduceWalking({ ...active(), lastEvidenceAt: 100000 }, tick, 60000, 30000)).toThrow(/persisted/);
});

// ---- Evidence freshness contract (gate-fix-s3) ----
// The adapter's per-source freshness is 5 s; the pedometer stamps cadence
// ~2.6 s behind delivery. Evidence that is adapter-fresh but older than the
// watermark (a foreground tick already advanced it) must still renew relief.
const walkedTo = (at: number) => {
  let s = active();
  for (let t = 4000; t <= at; t += 1000) s = reduceWalking(s, evidence(t - 2600, true), t, 30000);
  return s;
};
test('adapter-fresh evidence behind the watermark renews an active walk instead of letting it lapse', () => {
  let s = reduceWalking(active(), tick, 7000, 30000);
  expect(s).toMatchObject({ phase: 'active', watermark: 7000 });
  // Delivered at 7500 for source time 4900: 2.6 s old, fresh, newer than the last evidence.
  s = reduceWalking(s, evidence(4900, true), 7500, 30000);
  expect(s).toMatchObject({ phase: 'active', lastEvidenceAt: 4900, watermark: 7500 });
  expect(reduceWalking(s, tick, 9899, 30000).phase).toBe('active');
  expect(reduceWalking(s, tick, 9900, 30000)).toMatchObject({ phase: 'grace', graceEndsAt: 39900 });
});
test('a mid-walk stream of delayed cadence keeps relief live for the whole walk', () => {
  const s = walkedTo(60000);
  expect(s).toMatchObject({ phase: 'active', lastEvidenceAt: 57400, watermark: 60000 });
});
test('evidence older than the freshness window cannot renew relief even when newer than the last evidence', () => {
  const stopped = reduceWalking(active(), tick, 8000, 30000);
  expect(stopped.phase).toBe('grace');
  // Source time 2999 at wall 8000: 5.001 s old. Stale: still grace, deadline untouched.
  expect(reduceWalking(stopped, evidence(2999, true), 8000, 30000)).toEqual(stopped);
  // Source time 3000 at wall 8000: exactly 5 s old, but not newer than the last evidence (3000).
  expect(reduceWalking(stopped, evidence(3000, true), 8000, 30000)).toEqual(stopped);
  // Source time 3001: fresh and newer, resumes.
  expect(reduceWalking(stopped, evidence(3001, true), 8000, 30000).phase).toBe('active');
});
test('late negative evidence behind the watermark is honoured too', () => {
  const s = reduceWalking(active(), tick, 5000, 30000);
  expect(reduceWalking(s, evidence(4000, false), 5000, 30000)).toMatchObject({ phase: 'grace', graceEndsAt: 34000 });
});

// ---- Verified span: the fast path ----
const verified = (at: number, verifiedMs: number) => ({ kind: 'evidence' as const, at, qualifying: true, verifiedMs });
test('a verified span of three seconds or more qualifies immediately; less shortens the wait', () => {
  expect(reduceWalking(start, verified(5000, 4750), 5000, 30000)).toMatchObject({ phase: 'active', qualifyingSince: 2000, activeSince: 5000 });
  const partial = reduceWalking(start, verified(5000, 1500), 5000, 30000);
  expect(partial).toMatchObject({ phase: 'verifying', qualifyingSince: 3500 });
  expect(reduceWalking(partial, tick, 6499, 30000).phase).toBe('verifying');
  expect(reduceWalking(partial, tick, 6500, 30000)).toMatchObject({ phase: 'active', activeSince: 6500 });
});
test('a verified span only ever moves the qualifying start earlier, never later', () => {
  const verifying = reduceWalking(start, evidence(0, true), 0, 30000);
  const later = reduceWalking(verifying, verified(2000, 500), 2000, 30000);
  expect(later).toMatchObject({ phase: 'verifying', qualifyingSince: 0 });
  expect(reduceWalking(later, tick, 3000, 30000).phase).toBe('active');
});
test('a verified span resumes from grace without inventing an earlier active start', () => {
  const stopped = reduceWalking(active(), evidence(4000, false), 4000, 30000);
  expect(reduceWalking(stopped, verified(10000, 4750), 10000, 30000)).toMatchObject({ phase: 'active', activeSince: 3000, graceEndsAt: null });
});
test('a verified span is validated and never applies to non-qualifying evidence', () => {
  expect(() => reduceWalking(start, verified(5000, -1), 5000, 30000)).toThrow();
  expect(() => reduceWalking(start, verified(5000, NaN), 5000, 30000)).toThrow();
  expect(reduceWalking(start, { kind: 'evidence', at: 5000, qualifying: false, verifiedMs: 4750 }, 5000, 30000).phase).toBe('inactive');
  expect(reduceWalking(start, { kind: 'evidence', at: 5000, qualifying: 'unknown', verifiedMs: 4750 }, 5000, 30000).phase).toBe('inactive');
});
