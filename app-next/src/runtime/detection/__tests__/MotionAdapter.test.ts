import { MotionAdapter } from '../MotionAdapter';
import type { ActivitySample, CadenceSample, MotionProvider } from '../../../engine/signals/motion/MotionProvider';
function setup() {
  let now = 0;
  const activity = new Set<(v: ActivitySample) => void>();
  const cadence = new Set<(v: CadenceSample) => void>();
  const provider: MotionProvider = {
    getAvailability: () => ({ activity: true, cadence: true, stepCounting: true }),
    getAuthorizationStatus: () => 'authorized',
    requestAuthorization: async () => 'authorized',
    start: async () => {},
    stop: async () => {},
    queryActivity: async () => [],
    querySteps: async () => ({ steps: 12 }),
    on: ((event: 'activity' | 'cadence', callback: never) => {
      const set = event === 'activity' ? activity : cadence;
      set.add(callback);
      return () => set.delete(callback);
    }) as MotionProvider['on'],
  };
  const adapter = new MotionAdapter(provider, () => now);
  return {
    adapter,
    setNow: (v: number) => {
      now = v;
    },
    emitActivity: (v: ActivitySample) => activity.forEach((f) => f(v)),
    emitCadence: (v: CadenceSample) => cadence.forEach((f) => f(v)),
  };
}
test('medium walking OR cadence at eighty qualifies, with cadence converted once', async () => {
  const s = setup();
  await s.adapter.start();
  s.emitActivity({ classes: ['walking'], confidence: 'medium', startedAt: 0, receivedAt: 0 });
  expect(s.adapter.reconcile(0).qualifying).toBe(true);
  s.setNow(1000);
  s.emitActivity({ classes: ['stationary'], confidence: 'high', startedAt: 1000, receivedAt: 1000 });
  s.emitCadence({ stepsPerSecond: 80 / 60, cumulativeSteps: 4, asOf: 1000 });
  expect(s.adapter.reconcile(1000)).toMatchObject({ qualifying: true, cadencePerMinute: 80 });
});
test('quiet classification does not kill fresh cadence, but each source expires at five seconds', async () => {
  const s = setup();
  await s.adapter.start();
  s.emitActivity({ classes: ['stationary'], confidence: 'high', startedAt: 0, receivedAt: 0 });
  s.setNow(4000);
  s.emitCadence({ stepsPerSecond: 2, cumulativeSteps: 8, asOf: 4000 });
  expect(s.adapter.reconcile(6000).qualifying).toBe(true);
  expect(s.adapter.reconcile(9001).qualifying).toBe('unknown');
});
test('old cadence cannot make a newer negative activity qualify and history remains separate', async () => {
  const s = setup();
  await s.adapter.start();
  s.emitCadence({ stepsPerSecond: 2, cumulativeSteps: 8, asOf: 0 });
  s.setNow(6000);
  s.emitActivity({ classes: ['stationary'], confidence: 'high', startedAt: 6000, receivedAt: 6000 });
  expect(s.adapter.reconcile(6000).qualifying).toBe(false);
  await expect(s.adapter.querySteps(0, 6000)).resolves.toEqual({ steps: 12 });
});
test('rejects future and out-of-order source replacement and expires at exactly five seconds', async () => {
  const s = setup();
  await s.adapter.start();
  s.setNow(1000);
  s.emitCadence({ stepsPerSecond: 2, cumulativeSteps: 8, asOf: 1000 });
  s.emitCadence({ stepsPerSecond: 0, cumulativeSteps: 8, asOf: 999 });
  expect(s.adapter.reconcile(1000).qualifying).toBe(true);
  expect(s.adapter.reconcile(6000).qualifying).toBe('unknown');
  s.emitActivity({ classes: ['walking'], confidence: 'high', startedAt: 7000, receivedAt: 7000 });
  expect(s.adapter.reconcile(6000).qualifying).toBe('unknown');
});
