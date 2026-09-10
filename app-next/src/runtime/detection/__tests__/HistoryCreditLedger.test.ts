import { HistoryCreditLedger } from '../HistoryCreditLedger';
function setup() {
  let raw: string | null = null;
  const storage = { getItem: jest.fn(async () => raw), setItem: jest.fn(async (_key: string, value: string) => { raw = value; }) };
  return { storage, ledger: new HistoryCreditLedger(storage), corrupt: () => { raw = '{}'; }, seed: (value: unknown) => { raw = JSON.stringify(value); } };
}
const first = { idempotencyKey: 'steps:0:0:1000', from: 0, to: 1000, steps: 12 };
test('durably commits total and cursor atomically and dedups retries after process recreation', async () => {
  const { ledger, storage } = setup();
  await ledger.apply(first, 'UTC');
  const restarted = new HistoryCreditLedger(storage);
  expect((await restarted.apply(first, 'UTC')).stepsByDay['1970-01-01']).toBe(12);
  expect(storage.setItem).toHaveBeenCalledTimes(1);
});
test('failed storage commit cannot advance cursor or lose retry credit', async () => {
  const { ledger, storage } = setup();
  storage.setItem.mockRejectedValueOnce(new Error('disk'));
  await expect(ledger.apply(first, 'UTC')).rejects.toThrow('disk');
  expect((await ledger.apply(first, 'UTC')).stepsByDay['1970-01-01']).toBe(12);
});
test('concurrent duplicate and adjacent credits serialize without double-counting', async () => {
  const { ledger } = setup();
  await Promise.all([ledger.apply(first, 'UTC'), ledger.apply(first, 'UTC'), ledger.apply({ ...first, idempotencyKey: 'next', from: 1000, to: 2000, steps: 8 }, 'UTC')]);
  expect((await ledger.read()).stepsByDay['1970-01-01']).toBe(20);
});
test('overlap and mixed local-day totals are rejected rather than prorated', async () => {
  const { ledger } = setup(); await ledger.apply(first, 'UTC');
  await expect(ledger.apply({ ...first, to: 2000 }, 'UTC')).rejects.toThrow('overlaps');
  await expect(ledger.apply({ ...first, to: 86400001 }, 'UTC')).rejects.toThrow('midnight');
});
test('corrupt ledger fails visibly; explicit erasure resets credit authority', async () => {
  const { ledger, corrupt } = setup(); corrupt();
  await expect(ledger.read()).rejects.toThrow('Invalid');
  await ledger.reset(); expect((await ledger.read()).through).toBeNull();
});
test('post-seal pruning removes old totals but preserves the deduplication cursor', async () => {
  const { ledger } = setup();
  await ledger.apply(first, 'UTC');
  const through = (await ledger.read()).through;
  const pruned = await ledger.pruneBeforeDay('1970-01-02');
  expect(pruned).toEqual({ version: 1, through, stepsByDay: {}, instanceMeasurements: {} });
  expect((await ledger.apply(first, 'UTC')).stepsByDay).toEqual({});
});

test('legacy v1 state migrates missing instance measurements without changing totals or cursor', async () => {
  const { ledger, seed } = setup();
  seed({ version: 1, through: 1000, stepsByDay: { '1970-01-01': 12 } });
  expect(await ledger.read()).toEqual({
    version: 1, through: 1000, stepsByDay: { '1970-01-01': 12 }, instanceMeasurements: {},
  });
});

test('instance checkpoints update atomically without changing daily credit authority', async () => {
  const { ledger } = setup();
  await ledger.apply(first, 'UTC');
  await ledger.recordInstanceMeasurement('rule:day:end', { from: 0, through: 500, steps: 7, timezone: 'UTC' });
  await ledger.recordInstanceMeasurement('rule:day:end', { from: 0, through: 800, steps: 11, timezone: 'UTC' });
  expect(await ledger.readInstanceMeasurement('rule:day:end')).toEqual({ from: 0, through: 800, steps: 11, timezone: 'UTC' });
  expect(await ledger.read()).toEqual(expect.objectContaining({ through: 1000, stepsByDay: { '1970-01-01': 12 } }));
});

test('failed instance checkpoint persistence leaves no cached measurement and can be retried', async () => {
  const { ledger, storage } = setup();
  const sample = { from: 0, through: 500, steps: 7, timezone: 'UTC' };
  storage.setItem.mockRejectedValueOnce(new Error('checkpoint disk'));
  await expect(ledger.recordInstanceMeasurement('stable', sample)).rejects.toThrow('checkpoint disk');
  expect(await ledger.readInstanceMeasurement('stable')).toBeNull();
  await expect(ledger.recordInstanceMeasurement('stable', sample)).resolves.toEqual(sample);
});

test('instance checkpoint rejects collisions, backwards samples, changed replay values, and invalid input', async () => {
  const { ledger } = setup();
  const sample = { from: 0, through: 500, steps: 7, timezone: 'UTC' };
  await ledger.recordInstanceMeasurement('stable', sample);
  await expect(ledger.recordInstanceMeasurement('stable', { ...sample, from: 1 })).rejects.toThrow('conflicts');
  await expect(ledger.recordInstanceMeasurement('stable', { ...sample, timezone: 'America/Chicago' })).rejects.toThrow('conflicts');
  await expect(ledger.recordInstanceMeasurement('stable', { ...sample, through: 400 })).rejects.toThrow('backwards');
  await expect(ledger.recordInstanceMeasurement('stable', { ...sample, steps: 8 })).rejects.toThrow('changed steps');
  await expect(ledger.recordInstanceMeasurement('', sample)).rejects.toThrow('key');
  await expect(ledger.recordInstanceMeasurement('bad', { ...sample, steps: -1 })).rejects.toThrow('Invalid');
});

test('retention prunes instance checkpoints by their timezone-local from day', async () => {
  const { ledger } = setup();
  await ledger.recordInstanceMeasurement('old', { from: 0, through: 1000, steps: 1, timezone: 'UTC' });
  await ledger.recordInstanceMeasurement('kept', { from: 86_400_000, through: 86_401_000, steps: 2, timezone: 'UTC' });
  const state = await ledger.pruneBeforeDay('1970-01-02');
  expect(state.instanceMeasurements).toEqual({
    kept: { from: 86_400_000, through: 86_401_000, steps: 2, timezone: 'UTC' },
  });
});
