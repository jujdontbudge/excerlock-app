import type { CadenceSample, MotionProvider } from '../../../engine/signals/motion/MotionProvider';
import type { Rule } from '../../../domain/types';
import { detectionStore } from '../../../state/detectionStore';
import { DetectionService } from '../DetectionService';
import { MotionAdapter } from '../MotionAdapter';
import type { PlacementAdapter } from '../PlacementAdapter';
import { NativeWalkingPort } from '../NativeWalkingPort';

const stateRule: Rule = {
  id: 'walk-state', activity: 'walking', mode: { kind: 'state', activity: 'walking' }, enabled: true,
  schedule: { days: [1], window: { kind: 'allDay' } }, createdAt: new Date(0).toISOString(), updatedAt: new Date(0).toISOString(),
};

function setup() {
  let now = 0;
  const cadence = new Set<(sample: CadenceSample) => void>();
  const provider: MotionProvider = {
    getAvailability: () => ({ activity: true, cadence: true, stepCounting: true }),
    getAuthorizationStatus: () => 'authorized', requestAuthorization: async () => 'authorized',
    start: async () => {}, stop: async () => {}, queryActivity: async () => [], querySteps: async () => ({ steps: 0 }),
    on: ((event: string, callback: (sample: CadenceSample) => void) => {
      if (event === 'cadence') cadence.add(callback);
      return () => cadence.delete(callback);
    }) as unknown as MotionProvider['on'],
  };
  const motion = new MotionAdapter(provider, () => now);
  const placement = {
    start: async () => {}, stop: async () => {}, subscribe: () => () => {},
    reconcile: () => ({ placement: 'handheld' as const, at: now }),
  } as unknown as PlacementAdapter;
  const service = new DetectionService({
    motion, placement, gymLog: { append: async () => {}, readAll: async () => [] }, historyLedger: { read: async () => ({ version: 1, through: null, stepsByDay: {} }), apply: async () => { throw new Error('Walking-only test must not query history'); } }, persist: async () => {},
  });
  const port = new NativeWalkingPort({
    service, motion, placement, walkingGraceMs: () => 30_000, now: () => now,
    sleep: async (ms) => { now += ms; },
  });
  return {
    port, service, motion,
    emitCadence: (stepsPerSecond: number, cumulativeSteps = 0) => cadence.forEach((callback) => callback({ stepsPerSecond, cumulativeSteps, asOf: now })),
    setNow: (value: number) => { now = value; },
  };
}

beforeEach(() => detectionStore.getState().reset());

test('manual check uses live cadence for exactly three seconds and publishes persisted active state', async () => {
  const s = setup();
  const started = s.port.start(stateRule);
  await started;
  s.emitCadence(2, 10);
  await expect(s.port.check(stateRule)).resolves.toBe(true);
  expect(s.port.snapshot()).toMatchObject({ ruleId: 'walk-state', phase: 'active', since: new Date(3000).toISOString() });
  s.emitCadence(2, 15);
  expect(s.port.details()).toEqual({ steps: 5, walkingSeconds: 0 });
});

test('manual check is bounded and target walking can never start live relief', async () => {
  const s = setup();
  await expect(s.port.check(stateRule)).resolves.toBe(false);
  const target = { ...stateRule, mode: { kind: 'target' as const, activity: 'walking' as const, metric: 'steps' as const, goal: 1000 } };
  await expect(s.port.start(target)).rejects.toThrow('state condition');
  expect(detectionStore.getState().data.walking.phase).not.toBe('active');
});

test('scan pass stores authoritative verified time and cancellation rejects a stale completion', async () => {
  const s = setup();
  await s.port.start(stateRule, { placement: 'propped' });
  s.setNow(1000);
  expect(s.port.completeProppedScan()).toBe(true);
  await Promise.resolve(); await Promise.resolve();
  expect(detectionStore.getState().data.propped.verifiedSince).toBe(1000);
  expect(s.port.completeProppedScan()).toBe(false);
  expect(s.port.snapshot().proppedSince).toBe(new Date(1000).toISOString());
});

test('observeWalking reports fused OR evidence rather than fabricated session state', async () => {
  const s = setup();
  await s.port.start(stateRule);
  const seen: boolean[] = [];
  const stop = s.port.observeWalking((walking) => seen.push(walking));
  s.emitCadence(2, 4);
  s.setNow(1000); s.emitCadence(0, 4);
  stop();
  expect(seen).toEqual([false, true, false]);
});
