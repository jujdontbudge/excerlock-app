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
