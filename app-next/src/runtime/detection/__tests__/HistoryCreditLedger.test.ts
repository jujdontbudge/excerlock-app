import { HistoryCreditLedger } from '../HistoryCreditLedger';
function setup() {
  let raw: string | null = null;
  const storage = { getItem: jest.fn(async () => raw), setItem: jest.fn(async (_key: string, value: string) => { raw = value; }) };
  return { storage, ledger: new HistoryCreditLedger(storage), corrupt: () => { raw = '{}'; } };
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
  expect(pruned).toEqual({ version: 1, through, stepsByDay: {} });
  expect((await ledger.apply(first, 'UTC')).stepsByDay).toEqual({});
});
