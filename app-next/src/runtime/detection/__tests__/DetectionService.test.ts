import { DetectionService } from '../DetectionService';
import { detectionStore } from '../../../state/detectionStore';
import { confirmedGymRegions } from '../../../domain/gymMachine';
import type { MotionAdapter } from '../MotionAdapter';
import type { PlacementAdapter } from '../PlacementAdapter';
beforeEach(() => detectionStore.getState().reset());
test('headless wake consumes durable gym events and credits step history once', async () => {
  const querySteps = jest.fn(async () => ({ steps: 123 }));
  const creditHistory = jest.fn(async () => {});
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
    creditHistory,
  });
  await service.reconcileWake({ now: 31000, dayStart: 0, walkingGraceMs: 30000, generation: 0, source: 'geofence' });
  expect(confirmedGymRegions(detectionStore.getState().data.gym)).toEqual(['a']);
  expect(creditHistory).toHaveBeenCalledWith({ idempotencyKey: 'steps:0:0:31000', from: 0, to: 31000, steps: 123 });
  await service.reconcileWake({ now: 31000, dayStart: 0, walkingGraceMs: 30000, generation: 0, source: 'foreground' });
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
    creditHistory: async () => {},
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
    creditHistory,
  });
  const first = service.reconcileWake({
    now: 1000,
    dayStart: 0,
    walkingGraceMs: 30000,
    generation: 0,
    source: 'foreground',
  });
  const second = service.reconcileWake({
    now: 2000,
    dayStart: 0,
    walkingGraceMs: 30000,
    generation: 0,
    source: 'background',
  });
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
  expect(querySteps).toHaveBeenCalledTimes(1);
  release({ steps: 1 });
  await expect(first).rejects.toThrow('credit failed');
  await expect(second).resolves.toBeUndefined();
  expect(querySteps).toHaveBeenCalledTimes(1);
  expect(detectionStore.getState().data.creditedThrough.steps).toBe(1000);
  await service.reconcileWake({
    now: 2000,
    dayStart: 0,
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
  const service = new DetectionService({ motion, placement, gymLog, creditHistory: async () => {} });
  const wake = service.reconcileWake({
    now: 1000,
    dayStart: 0,
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
  const creditHistory = jest.fn(async () => {});
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
    creditHistory,
    persist,
  });
  const first = { now: 1000, dayStart: 0, walkingGraceMs: 30000, generation: 0, source: 'foreground' as const };
  await expect(service.reconcileWake(first)).rejects.toThrow('disk full');
  const pending = detectionStore.getState().data.pendingHistory!;
  await service.reconcileWake({ ...first, now: 2000 });
  expect(querySteps).toHaveBeenCalledTimes(1);
  expect(creditHistory).toHaveBeenNthCalledWith(1, pending);
  expect(creditHistory).toHaveBeenNthCalledWith(2, pending);
  expect(detectionStore.getState().data.creditedThrough.steps).toBe(1000);
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
