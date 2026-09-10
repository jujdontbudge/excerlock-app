import { confirmedGymRegions, createGymState, gymDwellMs, reduceGym } from '../gymMachine';
const row = (id: string, regionId: string, type: 'enter' | 'exit', atMs: number) => ({
  id,
  regionId,
  type,
  atMs,
  receivedAtMs: atMs,
});
test('enter confirms only on a later actual wake after thirty seconds', () => {
  const pending = reduceGym(createGymState(0), { kind: 'records', records: [row('e', 'a', 'enter', 1000)] }, 1000);
  expect(confirmedGymRegions(pending)).toEqual([]);
  expect(confirmedGymRegions(reduceGym(pending, { kind: 'tick' }, 30999))).toEqual([]);
  expect(confirmedGymRegions(reduceGym(pending, { kind: 'tick' }, 31000))).toEqual(['a']);
});
test('explicit exit before confirmation prevents presence; explicit exit after is immediate', () => {
  let state = reduceGym(
    createGymState(0),
    { kind: 'records', records: [row('e', 'a', 'enter', 1000), row('x', 'a', 'exit', 20000)] },
    20000,
  );
  expect(confirmedGymRegions(reduceGym(state, { kind: 'tick' }, 40000))).toEqual([]);
  state = reduceGym(createGymState(0), { kind: 'records', records: [row('e2', 'a', 'enter', 1000)] }, 31000);
  state = reduceGym(state, { kind: 'records', records: [row('x2', 'a', 'exit', 32000)] }, 32000);
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
  const active = reduceGym(createGymState(0), { kind: 'records', records: [row('e', 'a', 'enter', 0)] }, 30000);
  const lost = reduceGym(active, { kind: 'coverageLost' }, 60000);
  expect(confirmedGymRegions(lost)).toEqual([]);
  expect(lost.intervals[0].exitedAt).toBeNull();
});
test('clock rewind cannot replay old enter', () => {
  const expired = reduceGym(createGymState(10000), { kind: 'coverageLost' }, 20000);
  const replay = reduceGym(expired, { kind: 'records', records: [row('old', 'a', 'enter', 1000)] }, 5000);
  expect(replay.watermark).toBe(20000);
  expect(confirmedGymRegions(replay)).toEqual([]);
});
