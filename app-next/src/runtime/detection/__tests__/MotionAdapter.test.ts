import { MOTION_CLOCK_SKEW_MS, MotionAdapter, type MotionEvidence } from '../MotionAdapter';
import { SHIPPED_STRIDE_GATE } from '../strideGateConfig';
import { createWalkingState, reduceWalking, walkingRelief } from '../../../domain/walkingMachine';
import type { ActivitySample, CadenceSample, MotionProvider } from '../../../engine/signals/motion/MotionProvider';
import { STRIDE_PENALTY_MS, type StrideMotionSample } from '../StrideRhythm';
import { stillSamples, strideSegment } from './strideFixtures';
function setup(withStride = false) {
  let now = 0;
  const activity = new Set<(v: ActivitySample) => void>();
  const cadence = new Set<(v: CadenceSample) => void>();
  const stride = new Set<(v: StrideMotionSample) => void>();
  const strideUnsubscribe = jest.fn();
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
  const strideSource = {
    onSample: (callback: (v: StrideMotionSample) => void) => {
      stride.add(callback);
      return () => { stride.delete(callback); strideUnsubscribe(); };
    },
  };
  const adapter = new MotionAdapter(provider, () => now, withStride ? strideSource : null);
  return {
    adapter,
    strideUnsubscribe,
    setNow: (v: number) => {
      now = v;
    },
    emitActivity: (v: ActivitySample) => activity.forEach((f) => f(v)),
    emitCadence: (v: CadenceSample) => cadence.forEach((f) => f(v)),
    /** Feeds raw samples in order, advancing the clock with them. */
    emitStride: (samples: readonly StrideMotionSample[]) => {
      for (const sample of samples) {
        now = Math.max(now, sample.t);
        stride.forEach((f) => f(sample));
      }
    },
  };
}
/** Cadence samples every 2.5 s with the counter accruing at the given rate. */
function walkingCadence(s: ReturnType<typeof setup>, fromMs: number, toMs: number, perMinute: number, startSteps = 0) {
  let steps = startSteps;
  for (let at = fromMs; at <= toMs; at += 2500) {
    s.setNow(at);
    s.emitCadence({ stepsPerSecond: perMinute / 60, cumulativeSteps: Math.round(steps), asOf: at });
    steps += (perMinute / 60) * 2.5;
  }
  return steps;
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

test('stop releases every subscription and stops the provider despite synchronous cleanup failures', async () => {
  const removals = [jest.fn(() => { throw new Error('activity remove'); }), jest.fn(() => { throw new Error('cadence remove'); })];
  const provider = {
    getAuthorizationStatus: () => 'authorized', requestAuthorization: async () => 'authorized',
    on: jest.fn(() => removals.shift()!), start: async () => {},
    stop: jest.fn(async () => { throw new Error('provider stop'); }),
  } as unknown as MotionProvider;
  const adapter = new MotionAdapter(provider);
  await adapter.start();
  const stopped = adapter.stop();
  await expect(stopped).rejects.toMatchObject({ errors: expect.arrayContaining([
    expect.objectContaining({ message: 'activity remove' }),
    expect.objectContaining({ message: 'cadence remove' }),
    expect.objectContaining({ message: 'provider stop' }),
  ]) });
  expect(provider.stop).toHaveBeenCalledTimes(1);
});

// ---- Clock-mapping skew (gate-fix-s3, item 1a) ----
test('a classification whose mapped start lands a few ms after receipt is accepted and clamped', async () => {
  const s = setup();
  await s.adapter.start();
  s.setNow(1000);
  s.emitActivity({ classes: ['walking'], confidence: 'high', startedAt: 1027, receivedAt: 1000 });
  expect(s.adapter.reconcile(1000)).toMatchObject({ qualifying: true, activityAt: 1000 });
  s.setNow(2000);
  s.emitActivity({ classes: ['stationary'], confidence: 'high', startedAt: 2000 + MOTION_CLOCK_SKEW_MS + 1, receivedAt: 2000 });
  expect(s.adapter.reconcile(2000)).toMatchObject({ qualifying: true, activityAt: 1000 });
  s.emitActivity({ classes: ['stationary'], confidence: 'high', startedAt: 2000 + MOTION_CLOCK_SKEW_MS, receivedAt: 2000 });
  expect(s.adapter.reconcile(2000)).toMatchObject({ qualifying: false, activityAt: 2000 });
});
test('a pedometer sample stamped a few ms ahead of the clock is accepted at the clock, further ahead is rejected', async () => {
  const s = setup();
  await s.adapter.start();
  s.setNow(1000);
  s.emitCadence({ stepsPerSecond: 1.6, cumulativeSteps: 9, asOf: 1020 });
  expect(s.adapter.reconcile(1000)).toMatchObject({ qualifying: true, cadenceAt: 1000, cadencePerMinute: 96 });
  s.emitCadence({ stepsPerSecond: 0, cumulativeSteps: 9, asOf: 1000 + MOTION_CLOCK_SKEW_MS + 1 });
  expect(s.adapter.reconcile(1000)).toMatchObject({ qualifying: true, cadenceAt: 1000 });
});

// ---- Cadence corroboration (item 2) ----
test('cadence counts only while the pedometer counter keeps accruing; a carried post-stop rate does not', async () => {
  const s = setup();
  await s.adapter.start();
  const steps = walkingCadence(s, 0, 10000, 108);
  expect(s.adapter.reconcile(10000)).toMatchObject({ qualifying: true, cadencePerMinute: 108 });
  // The walker stops: currentCadence stays at 108 while the counter freezes.
  const carried = (at: number) => {
    s.setNow(at);
    s.emitCadence({ stepsPerSecond: 108 / 60, cumulativeSteps: Math.round(steps), asOf: at });
  };
  carried(12500);
  carried(15000);
  // The trailing 10 s still holds real steps: 5 s after the stop the rate is ~54/min.
  expect(s.adapter.reconcile(15000)).toMatchObject({ qualifying: true, cadencePerMinute: 108 });
  carried(17500);
  carried(20000);
  // 10 s after the stop the trailing counter is flat: the carried rate no longer counts.
  expect(s.adapter.reconcile(20000)).toMatchObject({ qualifying: false, cadencePerMinute: 108 });
  carried(22500);
  expect(s.adapter.reconcile(22500).qualifying).toBe(false);
});
test('the first cadence sample has no baseline and is trusted on its own', async () => {
  const s = setup();
  await s.adapter.start();
  s.setNow(5000);
  s.emitCadence({ stepsPerSecond: 1.7, cumulativeSteps: 400, asOf: 5000 });
  expect(s.adapter.reconcile(5000).qualifying).toBe(true);
});
test('a raw-stream still verdict vetoes the pedometer and the activity classifier alike', async () => {
  // f09377f9 +16.4 s: the phone measured still at 0.052 g while CMMotionActivity
  // kept reporting walking:high and CMPedometer carried 120.7 steps/min, so the
  // walk stayed in relief for the whole silence + grace. Neither Apple leg may
  // stand on a phone the raw stream can see is not moving.
  const s = setup(true);
  await s.adapter.start();
  s.emitStride(stillSamples(0, 5000));
  walkingCadence(s, 2500, 5000, 120, 50);
  expect(s.adapter.reconcile(5000)).toMatchObject({ qualifying: false, stride: 'still', stopped: false });
  s.emitActivity({ classes: ['walking'], confidence: 'high', startedAt: 5000, receivedAt: 5000 });
  expect(s.adapter.reconcile(5000)).toMatchObject({ qualifying: false, stride: 'still', activityAt: 5000, stopped: false });
});
test('a seated shake counted by the pedometer never qualifies: vetoed live and for the penalty window after', async () => {
  const s = setup(true);
  await s.adapter.start();
  const shake = strideSegment('shakeVigorous');
  const published: MotionEvidence[] = [];
  s.adapter.subscribe((evidence) => published.push(evidence));
  // CMPedometer reported the first shake rate 12.9 s in (cd592ea2); here it arrives once the raw verdict exists.
  s.emitStride(shake.slice(0, 200));
  expect(s.adapter.reconcile(shake[199].t).stride).toBe('notStride');
  walkingCadence(s, 4000, 5500, 130, 20);
  s.emitStride(shake.slice(200));
  const end = shake[shake.length - 1].t;
  expect(published.some((evidence) => evidence.qualifying === true)).toBe(false);
  expect(s.adapter.reconcile(end)).toMatchObject({ qualifying: false, stride: 'notStride' });
  // The hand stops but CMPedometer keeps reporting 130/min for a while: still vetoed.
  s.emitStride(stillSamples(end + 20, 3000));
  s.setNow(end + 3000);
  s.emitCadence({ stepsPerSecond: 130 / 60, cumulativeSteps: 60, asOf: end + 3000 });
  const after = s.adapter.reconcile(end + 3000);
  expect(after.qualifying).toBe(false);
  expect(after.stride).toBe('still');
  expect(published.some((evidence) => evidence.qualifying === true)).toBe(false);
});

// ---- Raw stride verdict as a qualifying source (item 3) ----
test('a confident stride verdict qualifies on its own with the verified span, and is published on change only', async () => {
  const s = setup(true);
  await s.adapter.start();
  const published: MotionEvidence[] = [];
  s.adapter.subscribe((evidence) => published.push(evidence));
  const walk = strideSegment('walkSteady');
  s.emitStride(walk);
  const end = walk[walk.length - 1].t;
  const evidence = s.adapter.reconcile(end);
  expect(evidence).toMatchObject({ qualifying: true, stride: 'walking', activityAt: null, cadenceAt: null });
  expect(evidence.verifiedMs).toBeGreaterThanOrEqual(3000);
  expect(evidence.observedAt).toBe(evidence.strideAt);
  expect(evidence.observedAt).toBeLessThanOrEqual(end);
  expect(evidence.observedAt).toBeGreaterThan(end - 250);
  const walking = published.filter((row) => row.stride === 'walking');
  expect(walking).toHaveLength(1);
  expect(walking[0].observedAt).toBeLessThanOrEqual(5000);
  expect(walking[0].verifiedMs).toBeGreaterThanOrEqual(3000);
});
test('a still phone never yields a walking verdict, and a silent raw stream contributes nothing', async () => {
  const s = setup(true);
  await s.adapter.start();
  s.emitStride(stillSamples(0, 6000));
  const still = s.adapter.reconcile(6000);
  expect(still).toMatchObject({ qualifying: false, stride: 'still', verifiedMs: 0, activityAt: null, cadenceAt: null });
  expect(still.observedAt).toBe(still.strideAt);
  expect(still.strideAt).toBeGreaterThan(5750);
  // No raw samples for two seconds: the verdict is unknown and the Apple sources set observedAt.
  s.setNow(8000);
  s.emitActivity({ classes: ['walking'], confidence: 'high', startedAt: 8000, receivedAt: 8000 });
  expect(s.adapter.reconcile(8000)).toMatchObject({ qualifying: true, stride: 'unknown', strideAt: null, observedAt: 8000 });
  expect(s.adapter.reconcile(13001)).toMatchObject({ qualifying: 'unknown', stride: 'unknown' });
});
test('stop releases the raw stream and start resets the stride state', async () => {
  const s = setup(true);
  await s.adapter.start();
  s.emitStride(strideSegment('walkSteady'));
  expect(s.adapter.reconcile(5980).stride).toBe('walking');
  await s.adapter.stop();
  expect(s.strideUnsubscribe).toHaveBeenCalledTimes(1);
  expect(s.adapter.reconcile(5980).stride).toBe('unknown');
  await s.adapter.start();
  expect(s.adapter.reconcile(5980)).toMatchObject({ stride: 'unknown', qualifying: 'unknown' });
  void STRIDE_PENALTY_MS;
});

// ---- Apple legs corroborated by the raw stream; the confirmed stop (walk-shake-stop-w1) ----
test('a phone measured still for the still-stop span is a confirmed stop; before that it is only negative', async () => {
  const s = setup(true);
  await s.adapter.start();
  const published: MotionEvidence[] = [];
  s.adapter.subscribe((evidence) => published.push(evidence));
  s.emitStride(stillSamples(0, 9_000));
  s.emitActivity({ classes: ['walking'], confidence: 'high', startedAt: 9_000, receivedAt: 9_000 });
  const before = s.adapter.reconcile(9_000);
  expect(before).toMatchObject({ qualifying: false, stride: 'still', stopped: false });
  s.emitStride(stillSamples(9_020, 4_000, 3));
  const after = s.adapter.reconcile(13_000);
  expect(after).toMatchObject({ qualifying: false, stride: 'still', stopped: true });
  expect(after.observedAt).toBe(after.strideAt);
  // The stop was published to listeners the moment the span was reached, not only on reconcile.
  const stops = published.filter((evidence) => evidence.stopped);
  expect(stops.length).toBeGreaterThan(0);
  expect(stops[0].observedAt).toBeGreaterThanOrEqual(SHIPPED_STRIDE_GATE.stillStopMs);
  expect(stops[0].observedAt).toBeLessThan(SHIPPED_STRIDE_GATE.stillStopMs + 600);
  expect(published.every((evidence) => !(evidence.stopped && evidence.qualifying === true))).toBe(true);
});
test('a confirmed stop needs uninterrupted stillness: handling the phone restarts the span', async () => {
  const s = setup(true);
  await s.adapter.start();
  // Still from 0 would have confirmed a stop at 10 s; a short shake at 6 s
  // (last sample 14 009) restarts the span from where its decaying tail first
  // measured still (window start 13 708), so 9 s after the shake dies is not
  // yet a stop and 10.3 s after it is.
  s.emitStride([...stillSamples(0, 6_000), ...strideSegment('shakeShort', 6_020), ...stillSamples(14_100, 5_900, 5)]);
  expect(s.adapter.reconcile(20_000)).toMatchObject({ stride: 'still', stopped: false });
  s.emitStride(stillSamples(20_000, 3_100, 5));
  expect(s.adapter.reconcile(23_100)).toMatchObject({ stride: 'still', stopped: false });
  s.emitStride(stillSamples(23_100, 1_300, 5));
  expect(s.adapter.reconcile(24_400)).toMatchObject({ stride: 'still', stopped: true });
});
test('the Apple legs corroborate a gait the rhythm check never confirms, and unlock it', async () => {
  // 8b91a77d: periodicity 0.2-0.39, step estimate alternating 1.4/1.9 Hz; the
  // stride path never publishes `walking`, Apple did at +4.6 s. This walk must
  // keep unlocking through the Apple path.
  const s = setup(true);
  await s.adapter.start();
  const walk = strideSegment('walkPocketGait', 4_020);
  let state = createWalkingState(0);
  let strideVerdicts = new Set<string>();
  let steps = 0;
  s.emitStride(stillSamples(0, 4_000));
  for (const sample of walk) {
    s.emitStride([sample]);
    if (sample.t % 1000 < 20) {
      s.emitActivity({ classes: ['walking'], confidence: 'high', startedAt: sample.t, receivedAt: sample.t });
      steps += 100 / 60;
      s.emitCadence({ stepsPerSecond: 100 / 60, cumulativeSteps: Math.round(steps), asOf: sample.t });
      const evidence = s.adapter.reconcile(sample.t);
      strideVerdicts.add(evidence.stride);
      state = reduceWalking(state, { kind: 'evidence', at: evidence.observedAt, qualifying: evidence.qualifying, verifiedMs: evidence.verifiedMs, stopped: evidence.stopped }, sample.t, 30_000);
      state = reduceWalking(state, { kind: 'tick' }, sample.t, 30_000);
    }
  }
  expect(strideVerdicts.has('walking')).toBe(false);
  expect(state.phase).toBe('active');
  expect(s.adapter.reconcile(walk[walk.length - 1].t)).toMatchObject({ qualifying: true, stride: 'unknown', stopped: false });
});
test.each(['shakeVigorous', 'shakeRotation', 'shakeSlowTail', 'shakeShort', 'sittingStill'] as const)(
  '%s with a hostile pedometer and a hostile activity classifier never earns relief',
  async (name) => {
    // Every Apple leg says "walking" throughout: 130 steps/min accruing and
    // walking:high every second. With the raw stream live, the legs may only
    // corroborate a gait-shaped window, and no captured shake sustains one.
    const s = setup(true);
    await s.adapter.start();
    const segment = strideSegment(name, 4_020);
    let state = createWalkingState(0);
    let steps = 0;
    const phases = new Set<string>();
    s.emitStride(stillSamples(0, 4_000));
    for (const sample of segment) {
      s.emitStride([sample]);
      if (sample.t % 1000 < 20) {
        s.emitActivity({ classes: ['walking'], confidence: 'high', startedAt: sample.t, receivedAt: sample.t });
        steps += 130 / 60;
        s.emitCadence({ stepsPerSecond: 130 / 60, cumulativeSteps: Math.round(steps), asOf: sample.t });
        const evidence = s.adapter.reconcile(sample.t);
        expect(evidence.stopped && evidence.qualifying === true).toBe(false);
        state = reduceWalking(state, { kind: 'evidence', at: evidence.observedAt, qualifying: evidence.qualifying, verifiedMs: evidence.verifiedMs, stopped: evidence.stopped }, sample.t, 30_000);
        state = reduceWalking(state, { kind: 'tick' }, sample.t, 30_000);
        phases.add(state.phase);
        expect(walkingRelief(state)).toBe(false);
      }
    }
    expect(phases.has('active')).toBe(false);
  },
);
test('with the raw stream absent the Apple legs stand alone, so the background path is unchanged', async () => {
  const s = setup(false);
  await s.adapter.start();
  s.setNow(5000);
  s.emitActivity({ classes: ['walking'], confidence: 'high', startedAt: 5000, receivedAt: 5000 });
  expect(s.adapter.reconcile(5000)).toMatchObject({ qualifying: true, stride: 'unknown', stopped: false });
  walkingCadence(s, 5000, 10000, 100);
  expect(s.adapter.reconcile(10000)).toMatchObject({ qualifying: true, stopped: false });
});
