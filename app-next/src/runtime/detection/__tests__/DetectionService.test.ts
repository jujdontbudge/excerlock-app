import { DetectionService, MAX_HISTORY_SEGMENTS_PER_WAKE } from '../DetectionService';
import { detectionStore } from '../../../state/detectionStore';
import { confirmedGymRegions } from '../../../domain/gymMachine';
import type { MotionAdapter } from '../MotionAdapter';
import type { PlacementAdapter } from '../PlacementAdapter';
import type { HistoryCredit } from '../DetectionService';
import { HistoryCreditLedger } from '../HistoryCreditLedger';
function historyLedger(applyImpl?: (credit: HistoryCredit) => Promise<void>) {
  let through: number | null = null;
  const apply = jest.fn(async (credit: HistoryCredit, _timezone: string) => {
    await applyImpl?.(credit);
    if (through === null || credit.to > through) through = credit.to;
    return { version: 1 as const, through, stepsByDay: {} };
  });
  return { read: jest.fn(async () => ({ version: 1 as const, through, stepsByDay: {} })), apply };
}
beforeEach(() => detectionStore.getState().reset());
test('headless wake consumes durable gym events and credits step history once', async () => {
  const querySteps = jest.fn(async () => ({ steps: 123 }));
  const ledger = historyLedger();
  const motion = {
    reconcile: (now: number) => ({
      qualifying: 'unknown' as const,
      observedAt: now,
      activityAt: null,
      cadenceAt: null,
      cadencePerMinute: null,
    }),
    querySteps,
  } as unknown as MotionAdapter;
  const placement = { reconcile: () => ({ placement: 'unknown' as const, at: null }) } as unknown as PlacementAdapter;
  const record = { id: 'a:enter:1000', regionId: 'a', type: 'enter' as const, atMs: 1000, receivedAtMs: 1000 };
  const service = new DetectionService({
    motion,
    placement,
    gymLog: { append: async () => {}, readAll: async () => [record] },
    historyLedger: ledger,
  });
  await service.reconcileWake({ now: 31000, dayStart: 0, timezone: 'UTC', walkingGraceMs: 30000, generation: 0, source: 'geofence' });
  expect(confirmedGymRegions(detectionStore.getState().data.gym)).toEqual(['a']);
  expect(ledger.apply).toHaveBeenCalledWith({ idempotencyKey: 'steps:0:0:31000', from: 0, to: 31000, steps: 123, timezone: 'UTC' }, 'UTC');
  await service.reconcileWake({ now: 31000, dayStart: 0, timezone: 'UTC', walkingGraceMs: 30000, generation: 0, source: 'foreground' });
  expect(querySteps).toHaveBeenCalledTimes(1);
});
test('coverage loss invalidates every transient live detector', async () => {
  const data = detectionStore.getState().data;
  detectionStore.getState().patch({
    walking: { ...data.walking, phase: 'active', activeSince: 0, lastEvidenceAt: 0, lastQualifying: true },
    propped: { ...data.propped, phase: 'propped' },
  });
  const service = new DetectionService({
    motion: {} as MotionAdapter,
    placement: {} as PlacementAdapter,
    gymLog: { append: async () => {}, readAll: async () => [] },
    historyLedger: historyLedger(),
  });
  await service.noteCoverageLost(6000, 30000, 0);
  expect(detectionStore.getState().data.walking.phase).toBe('grace');
  expect(detectionStore.getState().data.propped.phase).toBe('inactive');
});
test('concurrent wakes serialize credits and a failed transaction does not poison the queue', async () => {
  let release!: (value: { steps: number }) => void;
  const querySteps = jest
    .fn()
    .mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          release = resolve;
        }),
    )
    .mockResolvedValue({ steps: 2 });
  const creditHistory = jest.fn().mockRejectedValueOnce(new Error('credit failed')).mockResolvedValue(undefined);
  const ledger = historyLedger(creditHistory);
  const motion = {
    reconcile: (now: number) => ({
      qualifying: 'unknown' as const,
      observedAt: now,
      activityAt: null,
      cadenceAt: null,
      cadencePerMinute: null,
    }),
    querySteps,
  } as unknown as MotionAdapter;
  const placement = { reconcile: () => ({ placement: 'unknown' as const, at: null }) } as unknown as PlacementAdapter;
  const service = new DetectionService({
    motion,
    placement,
    gymLog: { append: async () => {}, readAll: async () => [] },
    historyLedger: ledger,
  });
  const first = service.reconcileWake({
    now: 1000,
    dayStart: 0,
    timezone: 'UTC',
    walkingGraceMs: 30000,
    generation: 0,
    source: 'foreground',
  });
  const second = service.reconcileWake({
    now: 2000,
    dayStart: 0,
    timezone: 'UTC',
    walkingGraceMs: 30000,
    generation: 0,
    source: 'background',
  });
  while (querySteps.mock.calls.length === 0) await Promise.resolve();
  expect(querySteps).toHaveBeenCalledTimes(1);
  release({ steps: 1 });
  await expect(first).rejects.toThrow('credit failed');
  await expect(second).resolves.toBeUndefined();
  expect(querySteps).toHaveBeenCalledTimes(2);
  expect(detectionStore.getState().data.creditedThrough.steps).toBe(2000);
  await service.reconcileWake({
    now: 2000,
    dayStart: 0,
    timezone: 'UTC',
    walkingGraceMs: 30000,
    generation: 0,
    source: 'background',
  });
  expect(querySteps).toHaveBeenNthCalledWith(2, 1000, 2000);
  expect(detectionStore.getState().data.creditedThrough.steps).toBe(2000);
});
test('late wake rejects after account generation changes during an await', async () => {
  let release!: (value: readonly never[]) => void;
  const gymLog = {
    append: async () => {},
    readAll: () =>
      new Promise<readonly never[]>((resolve) => {
        release = resolve;
      }),
  };
  const motion = {
    reconcile: (now: number) => ({
      qualifying: 'unknown' as const,
      observedAt: now,
      activityAt: null,
      cadenceAt: null,
      cadencePerMinute: null,
    }),
  } as unknown as MotionAdapter;
  const placement = { reconcile: () => ({ placement: 'unknown' as const, at: null }) } as unknown as PlacementAdapter;
  const service = new DetectionService({ motion, placement, gymLog, historyLedger: historyLedger() });
  const wake = service.reconcileWake({
    now: 1000,
    dayStart: 0,
    timezone: 'UTC',
    walkingGraceMs: 30000,
    generation: 0,
    source: 'foreground',
  });
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
  detectionStore.getState().patch({ generation: 1 });
  release([]);
  await expect(wake).rejects.toThrow('Obsolete detection generation');
  expect(detectionStore.getState().data.observedAt).toBe(0);
});
test('cursor persistence failure retries the exact credited intent and key before a newer range', async () => {
  const ledger = historyLedger();
  let writes = 0;
  const persist = jest.fn(async () => {
    writes += 1;
    if (writes === 2) throw new Error('disk full');
  });
  const querySteps = jest.fn(async () => ({ steps: 5 }));
  const motion = {
    reconcile: (now: number) => ({
      qualifying: 'unknown' as const,
      observedAt: now,
      activityAt: null,
      cadenceAt: null,
      cadencePerMinute: null,
    }),
    querySteps,
  } as unknown as MotionAdapter;
  const placement = { reconcile: () => ({ placement: 'unknown' as const, at: null }) } as unknown as PlacementAdapter;
  const service = new DetectionService({
    motion,
    placement,
    gymLog: { append: async () => {}, readAll: async () => [] },
    historyLedger: ledger,
    persist,
  });
  const first = { now: 1000, dayStart: 0, timezone: 'UTC', walkingGraceMs: 30000, generation: 0, source: 'foreground' as const };
  await expect(service.reconcileWake(first)).rejects.toThrow('disk full');
  const pending = detectionStore.getState().data.pendingHistory!;
  await service.reconcileWake({ ...first, now: 2000 });
  expect(querySteps).toHaveBeenCalledTimes(2);
  expect(ledger.apply).toHaveBeenNthCalledWith(1, pending, 'UTC');
  expect(ledger.apply).toHaveBeenNthCalledWith(2, pending, 'UTC');
  expect(ledger.apply).toHaveBeenNthCalledWith(3, { idempotencyKey: 'steps:0:1000:2000', from: 1000, to: 2000, steps: 5, timezone: 'UTC' }, 'UTC');
  expect(detectionStore.getState().data.creditedThrough.steps).toBe(2000);
});

function serviceForHistory(querySteps: jest.Mock, ledger: HistoryCreditLedger) {
  const motion = {
    reconcile: (now: number) => ({ qualifying: 'unknown' as const, observedAt: now, activityAt: null, cadenceAt: null, cadencePerMinute: null }),
    querySteps,
  } as unknown as MotionAdapter;
  return new DetectionService({
    motion,
    placement: { reconcile: () => ({ placement: 'unknown' as const, at: null }) } as unknown as PlacementAdapter,
    gymLog: { append: async () => {}, readAll: async () => [] },
    historyLedger: ledger,
    persist: async () => {},
  });
}

test('history queries split exactly at local midnight before ledger commits', async () => {
  let raw: string | null = JSON.stringify({ version: 1, through: Date.parse('2026-09-10T04:59:00Z'), stepsByDay: {} });
  const ledger = new HistoryCreditLedger({
    getItem: async () => raw,
    setItem: async (_key, value) => { raw = value; },
  });
  const querySteps = jest.fn(async (from: number) => ({ steps: from === Date.parse('2026-09-10T04:59:00Z') ? 10 : 20 }));
  const service = serviceForHistory(querySteps, ledger);
  await service.reconcileWake({
    now: Date.parse('2026-09-10T05:01:00Z'),
    dayStart: Date.parse('2026-09-10T05:00:00Z'),
    timezone: 'America/Chicago', walkingGraceMs: 30_000, generation: 0, source: 'foreground',
  });
  expect(querySteps.mock.calls).toEqual([
    [Date.parse('2026-09-10T04:59:00Z'), Date.parse('2026-09-10T05:00:00Z')],
    [Date.parse('2026-09-10T05:00:00Z'), Date.parse('2026-09-10T05:01:00Z')],
  ]);
  expect((await ledger.read()).stepsByDay).toEqual({ '2026-09-09': 10, '2026-09-10': 20 });
});

test('restart initializes query cursor from durable ledger rather than skipping from day start', async () => {
  let raw: string | null = null;
  const storage = { getItem: async () => raw, setItem: async (_key: string, value: string) => { raw = value; } };
  const firstLedger = new HistoryCreditLedger(storage);
  await firstLedger.apply({ idempotencyKey: 'old', from: 0, to: 1000, steps: 4 }, 'UTC');
  detectionStore.getState().reset();
  const querySteps = jest.fn(async () => ({ steps: 2 }));
  const restarted = serviceForHistory(querySteps, new HistoryCreditLedger(storage));
  await restarted.reconcileWake({ now: 2000, dayStart: 0, timezone: 'UTC', walkingGraceMs: 30_000, generation: 0, source: 'background' });
  expect(querySteps).toHaveBeenCalledWith(1000, 2000);
  expect((await firstLedger.read()).stepsByDay['1970-01-01']).toBe(6);
});

test('failed ledger write leaves exact pending intent for restart replay before any new query', async () => {
  let raw: string | null = null;
  let fail = true;
  const storage = {
    getItem: async () => raw,
    setItem: async (_key: string, value: string) => { if (fail) throw new Error('ledger disk'); raw = value; },
  };
  const querySteps = jest.fn(async () => ({ steps: 7 }));
  const wake = { now: 1000, dayStart: 0, timezone: 'UTC', walkingGraceMs: 30_000, generation: 0, source: 'background' as const };
  await expect(serviceForHistory(querySteps, new HistoryCreditLedger(storage)).reconcileWake(wake)).rejects.toThrow('ledger disk');
  const pending = detectionStore.getState().data.pendingHistory;
  expect(pending).toEqual({ idempotencyKey: 'steps:0:0:1000', from: 0, to: 1000, steps: 7, timezone: 'UTC' });
  fail = false;
  const restarted = serviceForHistory(querySteps, new HistoryCreditLedger(storage));
  await restarted.reconcileWake({ ...wake, now: 2000 });
  expect(querySteps).toHaveBeenCalledTimes(2);
  expect(querySteps).toHaveBeenNthCalledWith(2, 1000, 2000);
  expect((await new HistoryCreditLedger(storage).read()).stepsByDay['1970-01-01']).toBe(14);
});

test('pending replay retains its original timezone after travel', async () => {
  let raw: string | null = null;
  let fail = true;
  const storage = {
    getItem: async () => raw,
    setItem: async (_key: string, value: string) => { if (fail) throw new Error('offline'); raw = value; },
  };
  const from = Date.parse('2026-09-10T04:59:00Z');
  const to = Date.parse('2026-09-10T05:01:00Z');
  const querySteps = jest.fn(async () => ({ steps: 3 }));
  detectionStore.getState().patch({ creditedThrough: { steps: from } });
  const first = serviceForHistory(querySteps, new HistoryCreditLedger(storage));
  await expect(first.reconcileWake({ now: to, dayStart: from, timezone: 'UTC', walkingGraceMs: 30_000, generation: 0, source: 'background' })).rejects.toThrow('offline');
  expect(detectionStore.getState().data.pendingHistory?.timezone).toBe('UTC');
  fail = false;
  const restarted = serviceForHistory(querySteps, new HistoryCreditLedger(storage));
  await expect(restarted.reconcileWake({ now: to, dayStart: from, timezone: 'America/Chicago', walkingGraceMs: 30_000, generation: 0, source: 'foreground' })).resolves.toBeUndefined();
  expect((await new HistoryCreditLedger(storage).read()).stepsByDay['2026-09-10']).toBe(3);
});

test('large catch-up is capped per wake and leaves the durable cursor ready to continue', async () => {
  const storage = { value: null as string | null };
  const ledger = new HistoryCreditLedger({
    getItem: async () => storage.value,
    setItem: async (_key, value) => { storage.value = value; },
  });
  const querySteps = jest.fn(async () => ({ steps: 1 }));
  await serviceForHistory(querySteps, ledger).reconcileWake({
    now: 10 * 86_400_000, dayStart: 0, timezone: 'UTC', walkingGraceMs: 30_000, generation: 0, source: 'background',
  });
  expect(querySteps).toHaveBeenCalledTimes(MAX_HISTORY_SEGMENTS_PER_WAKE);
  expect((await ledger.read()).through).toBe(MAX_HISTORY_SEGMENTS_PER_WAKE * 86_400_000);
});

test('qualified pickup walking joins propped policy and stops only after the one walking grace', async () => {
  let qualifying: boolean | 'unknown' = true;
  let observedAt = 0;
  const data = detectionStore.getState().data;
  detectionStore.getState().patch({
    propped: { ...data.propped, phase: 'handheld', deadlineAt: 20_000, verifiedSince: 0 },
  });
  const motion = {
    reconcile: () => ({ qualifying, observedAt, activityAt: observedAt, cadenceAt: null, cadencePerMinute: null }),
  } as unknown as MotionAdapter;
  const service = new DetectionService({
    motion,
    placement: {} as PlacementAdapter,
    gymLog: { append: async () => {}, readAll: async () => [] },
    creditHistory: async () => {},
    persist: async () => {},
  });
  await service.reconcileMotion(0, 30_000, 0);
  observedAt = 3_000;
  await service.reconcileMotion(3_000, 30_000, 0);
  expect(detectionStore.getState().data.propped.phase).toBe('active');
  qualifying = false;
  observedAt = 4_000;
  await service.reconcileMotion(4_000, 30_000, 0);
  expect(detectionStore.getState().data.walking.phase).toBe('grace');
  expect(detectionStore.getState().data.propped.phase).toBe('active');
  observedAt = 34_000;
  await service.reconcileMotion(34_000, 30_000, 0);
  expect(detectionStore.getState().data.walking.phase).toBe('inactive');
  expect(detectionStore.getState().data.propped.phase).toBe('inactive');
});
