import { confirmedGymRegions, createGymState, gymDwellMs, pruneGymHistoryBefore, reduceGym } from '../gymMachine';
const row = (id: string, regionId: string, type: 'enter' | 'exit', atMs: number) => ({
  id,
  regionId,
  type,
  atMs,
  receivedAtMs: atMs,
});
test('enter confirms only on a later actual wake after ten seconds', () => {
  const pending = reduceGym(createGymState(0), { kind: 'records', records: [row('e', 'a', 'enter', 1000)] }, 1000);
  expect(confirmedGymRegions(pending)).toEqual([]);
  expect(confirmedGymRegions(reduceGym(pending, { kind: 'tick' }, 10999))).toEqual([]);
  expect(confirmedGymRegions(reduceGym(pending, { kind: 'tick' }, 11000))).toEqual(['a']);
});
test('explicit exit before confirmation prevents presence; explicit exit after is immediate', () => {
  let state = reduceGym(
    createGymState(0),
    { kind: 'records', records: [row('e', 'a', 'enter', 1000), row('x', 'a', 'exit', 10000)] },
    10000,
  );
  expect(confirmedGymRegions(reduceGym(state, { kind: 'tick' }, 40000))).toEqual([]);
  state = reduceGym(createGymState(0), { kind: 'records', records: [row('e2', 'a', 'enter', 1000)] }, 11000);
  state = reduceGym(state, { kind: 'records', records: [row('x2', 'a', 'exit', 12000)] }, 12000);
  expect(confirmedGymRegions(state)).toEqual([]);
  expect(gymDwellMs(state, 'a', 99999)).toBe(1000);
});
test('duplicates, out-of-order delivery and overlapping places do not double credit', () => {
  const rows = [
    row('b-enter', 'b', 'enter', 2000),
    row('a-exit', 'a', 'exit', 40000),
    row('a-enter', 'a', 'enter', 1000),
    row('a-enter', 'a', 'enter', 1000),
  ];
  const once = reduceGym(createGymState(0), { kind: 'records', records: rows }, 40000);
  const twice = reduceGym(once, { kind: 'records', records: rows }, 40000);
  expect(twice).toEqual(once);
  expect(confirmedGymRegions(once)).toEqual(['b']);
  expect(once.intervals).toHaveLength(2);
});
test('coverage loss invalidates live relief without inventing an exit interval', () => {
  const active = reduceGym(createGymState(0), { kind: 'records', records: [row('e', 'a', 'enter', 0)] }, 10000);
  const lost = reduceGym(active, { kind: 'coverageLost' }, 60000);
  expect(confirmedGymRegions(lost)).toEqual([]);
  expect(lost.intervals[0].exitedAt).toBe(60000);
  expect(gymDwellMs(lost, 'a', 99999)).toBe(50000);
  expect(confirmedGymRegions(reduceGym(lost, { kind: 'tick' }, 90000))).toEqual([]);
});
test('clock rewind cannot replay old enter after coverage loss', () => {
  const expired = reduceGym(createGymState(10000), { kind: 'coverageLost', regionId: 'a' }, 20000);
  const replay = reduceGym(expired, { kind: 'records', records: [row('old', 'a', 'enter', 1000)] }, 5000);
  expect(replay.watermark).toBe(20000);
  expect(confirmedGymRegions(replay)).toEqual([]);
});
test('per-region coverage boundary closes dwell and cannot resurrect on tick', () => {
  let state = reduceGym(
    createGymState(0),
    { kind: 'records', records: [row('a', 'a', 'enter', 0), row('b', 'b', 'enter', 0)] },
    30000,
  );
  state = reduceGym(state, { kind: 'coverageLost', regionId: 'a' }, 40000);
  expect(confirmedGymRegions(state)).toEqual(['b']);
  expect(gymDwellMs(state, 'a', 100000)).toBe(30000);
  expect(confirmedGymRegions(reduceGym(state, { kind: 'tick' }, 100000))).toEqual(['b']);
});
test('exit deterministically dominates enter at the same timestamp', () => {
  const state = reduceGym(
    createGymState(0),
    { kind: 'records', records: [row('enter', 'a', 'enter', 1000), row('exit', 'a', 'exit', 1000)] },
    40000,
  );
  expect(confirmedGymRegions(state)).toEqual([]);
});
test('post-seal pruning drops closed history but preserves an open visit boundary', () => {
  const state = reduceGym(createGymState(0), { kind: 'records', records: [
    row('closed-in', 'closed', 'enter', 1), row('closed-out', 'closed', 'exit', 40_000),
    row('open-in', 'open', 'enter', 50_000),
  ] }, 100_000);
  const pruned = pruneGymHistoryBefore(state, 45_000);
  expect(pruned.records.map(({ id }) => id)).toEqual(['open-in']);
  expect(pruned.intervals.map(({ regionId }) => regionId)).toEqual(['open']);
  expect(confirmedGymRegions(reduceGym(pruned, { kind: 'tick' }, 110_000))).toEqual(['open']);
});
