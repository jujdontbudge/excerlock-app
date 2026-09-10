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
  expect(querySteps).toHaveBeenNthCalledWith(2, 0, 2000);
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
