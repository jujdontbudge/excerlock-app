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
  await service.reconcileWake({ now: 31000, dayStart: 0, walkingGraceMs: 30000, source: 'geofence' });
  expect(confirmedGymRegions(detectionStore.getState().data.gym)).toEqual(['a']);
  expect(creditHistory).toHaveBeenCalledWith({ from: 0, to: 31000, steps: 123 });
  await service.reconcileWake({ now: 31000, dayStart: 0, walkingGraceMs: 30000, source: 'foreground' });
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
  await service.noteCoverageLost(6000, 30000);
  expect(detectionStore.getState().data.walking.phase).toBe('grace');
  expect(detectionStore.getState().data.propped.phase).toBe('inactive');
});
