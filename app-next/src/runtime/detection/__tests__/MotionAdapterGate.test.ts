import { MOTION_CLOCK_SKEW_MS, MOTION_FRESHNESS_MS, MotionAdapter, type MotionEvidence } from '../MotionAdapter';
import type { ActivitySample, CadenceSample, MotionProvider } from '../../../engine/signals/motion/MotionProvider';
import type { StrideMotionSample } from '../StrideRhythm';
import {
  SHIPPED_STRIDE_GATE,
  SHIPPED_STRIDE_GATE_REPORT,
  resolveStrideGateConfig,
  type StrideGateReport,
} from '../strideGateConfig';
import { strideSegment } from './strideFixtures';

/**
 * The control surface around the gate, end to end on the adapter: what an
 * accepted payload changes, what the kill switch restores, and the proof that
 * the effective-config report is the configuration the analyzer actually ran.
 */

function setup(gate?: StrideGateReport) {
  let now = 0;
  const activity = new Set<(v: ActivitySample) => void>();
  const cadence = new Set<(v: CadenceSample) => void>();
  const stride = new Set<(v: StrideMotionSample) => void>();
  let strideSourceSubscriptions = 0;
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
      strideSourceSubscriptions += 1;
      stride.add(callback);
      return () => {
        stride.delete(callback);
      };
    },
  };
  const adapter = new MotionAdapter(provider, () => now, strideSource, gate);
  return {
    adapter,
    strideSourceSubscriptions: () => strideSourceSubscriptions,
    liveStrideListeners: () => stride.size,
    setNow: (value: number) => {
      now = value;
    },
    emitActivity: (value: ActivitySample) => {
      now = Math.max(now, value.receivedAt);
      activity.forEach((f) => f(value));
    },
    emitCadence: (value: CadenceSample) => {
      now = Math.max(now, value.asOf);
      cadence.forEach((f) => f(value));
    },
    /** Delivers a sample without moving the mock clock, so a future stamp can be tested. */
    deliverActivity: (value: ActivitySample) => activity.forEach((f) => f(value)),
    deliverCadence: (value: CadenceSample) => cadence.forEach((f) => f(value)),
    /** Feeds raw samples in order, advancing the clock with them, then reconciles. */
    feedStride: (samples: readonly StrideMotionSample[]) => {
      for (const sample of samples) {
        now = Math.max(now, sample.t);
        stride.forEach((f) => f(sample));
      }
      return adapter.reconcile(now);
    },
  };
}

/** When the adapter first publishes a `walking` stride verdict on a capture. */
async function strideOnsetAt(report: StrideGateReport, capture: 'walkSteady' | 'walkColdStart'): Promise<number | null> {
  const s = setup(report);
  await s.adapter.start();
  let onset: number | null = null;
  for (const sample of strideSegment(capture)) {
    if (s.feedStride([sample]).stride === 'walking' && onset === null) onset = sample.t;
  }
  await s.adapter.stop();
  return onset;
}

const walkingActivity = (at: number): ActivitySample => ({
  classes: ['walking'],
  confidence: 'high',
  startedAt: at,
  receivedAt: at,
});

const cadenceSample = (at: number, stepsPerMinute: number, cumulativeSteps: number): CadenceSample => ({
  stepsPerSecond: stepsPerMinute / 60,
  cumulativeSteps,
  asOf: at,
});

const gateOn = (params: Record<string, number>) => {
  const report = resolveStrideGateConfig({ params });
  if (report.source !== 'remote') throw new Error(`test payload rejected: ${report.reason}`);
  return report;
};

const killSwitch = () => {
  const report = resolveStrideGateConfig({ killSwitch: true });
  if (report.source !== 'remote') throw new Error('test kill switch rejected');
  return report;
};

/** A payload with one value outside its clamp: the whole payload is rejected. */
const rejected = () => resolveStrideGateConfig({ payload: { stillG: 0.5 } });

describe('the effective-config report is what the adapter runs', () => {
  test('an applied report is the adapter’s report, field for field', async () => {
    const report = gateOn({ stillG: 0.07, walkDwell: 10 });
    const s = setup(report);
    await s.adapter.start();
    expect(s.adapter.strideGate()).toBe(report);
    expect(s.adapter.strideGate().effective).toBe(report.effective);
    expect(s.adapter.strideGate().fields.stillG).toEqual({ requested: 0.07, applied: 0.07, accepted: true, reason: null });
    expect(s.adapter.strideGate().source).toBe('remote');
    await s.adapter.stop();
  });

  test('the reported evaluation interval and dwell are the numbers that govern the verdict', async () => {
    const shippedOnset = await strideOnsetAt(SHIPPED_STRIDE_GATE_REPORT, 'walkColdStart');
    const slowReport = gateOn({ evaluationIntervalMs: 500, walkDwell: 8 });
    const slowOnset = await strideOnsetAt(slowReport, 'walkColdStart');
    expect(shippedOnset).not.toBeNull();
    expect(slowOnset).not.toBeNull();
    // Seven more 250 ms hops before the eighth stride window may publish.
    expect(slowOnset! - shippedOnset!).toBeGreaterThanOrEqual(1_500);
    expect(slowReport.effective.evaluationIntervalMs - SHIPPED_STRIDE_GATE.evaluationIntervalMs).toBe(250);
  });

  test('the accepted qualifying credit, not the raw span, reaches the reducer', async () => {
    const s = setup(gateOn({ qualifyCreditMs: 1_000 }));
    await s.adapter.start();
    const evidence = s.feedStride(strideSegment('walkSteady'));
    expect(evidence.stride).toBe('walking');
    expect(evidence.verifiedMs).toBe(1_000);
    await s.adapter.stop();
  });

  test('applying the same configuration again does not restart the dwell', async () => {
    const report = gateOn({ stillG: 0.07 });
    const s = setup(report);
    await s.adapter.start();
    const samples = strideSegment('walkSteady');
    for (const sample of samples.slice(0, 250)) s.feedStride([sample]);
    s.adapter.applyStrideGateConfig(report);
    const evidence = s.feedStride(samples.slice(250));
    expect(evidence.stride).toBe('walking');
    await s.adapter.stop();
  });

  test('a parameter change resets the reader so no verdict mixes two parameter sets', async () => {
    const s = setup();
    await s.adapter.start();
    expect(s.feedStride(strideSegment('walkSteady')).stride).toBe('walking');
    s.adapter.applyStrideGateConfig(gateOn({ walkDwell: 32, evaluationIntervalMs: 250 }));
    expect(s.adapter.reconcile(6_000).stride).toBe('unknown');
    await s.adapter.stop();
  });

  test('a default-constructed adapter runs the shipped report, so today’s gate is the default', async () => {
    const defaults = setup();
    const explicit = setup(SHIPPED_STRIDE_GATE_REPORT);
    await defaults.adapter.start();
    await explicit.adapter.start();
    expect(defaults.adapter.strideGate()).toBe(SHIPPED_STRIDE_GATE_REPORT);
    const walk = strideSegment('walkSteady');
    const implicitEvidence = defaults.feedStride(walk);
    const explicitEvidence = explicit.feedStride(walk);
    expect(implicitEvidence).toEqual(explicitEvidence);
    expect(implicitEvidence.stride).toBe('walking');
    expect(implicitEvidence.verifiedMs).toBeGreaterThan(0);
    await defaults.adapter.stop();
    await explicit.adapter.stop();
  });

  test('a rejected payload reverts a running remote configuration to the shipped gate', async () => {
    const s = setup(gateOn({ walkDwell: 32 }));
    await s.adapter.start();
    expect(s.feedStride(strideSegment('walkSteady')).stride).not.toBe('walking');
    const fallback = rejected();
    expect(fallback.source).toBe('rejected');
    s.adapter.applyStrideGateConfig(fallback);
    expect(s.adapter.strideGate()).toBe(fallback);
    expect(s.adapter.strideGate().reason).toContain('stillG');
    expect(s.feedStride(strideSegment('treadmillSteady', 100_000)).stride).toBe('walking');
    await s.adapter.stop();
  });
});

describe('the kill switch restores the Apple-only legs', () => {
  test('with the kill switch on the raw stream is never subscribed and adds no verdict', async () => {
    const s = setup(killSwitch());
    await s.adapter.start();
    expect(s.strideSourceSubscriptions()).toBe(0);
    expect(s.liveStrideListeners()).toBe(0);
    const evidence = s.feedStride(strideSegment('walkSteady'));
    expect(evidence).toMatchObject({ stride: 'unknown', strideAt: null, verifiedMs: 0, qualifying: 'unknown' });
    expect(s.adapter.strideGate().killSwitch).toEqual({ requested: true, applied: true });
    await s.adapter.stop();
  });

  test('Apple activity and an accruing pedometer still qualify, exactly as before the gate', async () => {
    const s = setup(killSwitch());
    await s.adapter.start();
    s.emitActivity(walkingActivity(1_000));
    expect(s.adapter.reconcile(1_000)).toMatchObject({ qualifying: true, activityAt: 1_000, stride: 'unknown' });
    s.emitCadence(cadenceSample(2_000, 120, 10));
    s.emitCadence(cadenceSample(3_000, 120, 12));
    expect(s.adapter.reconcile(3_000)).toMatchObject({
      qualifying: true,
      cadenceAt: 3_000,
      cadencePerMinute: 120,
      stride: 'unknown',
      verifiedMs: 0,
    });
    // Both Apple sources expire after the same five seconds as before.
    expect(s.adapter.reconcile(3_000 + MOTION_FRESHNESS_MS)).toMatchObject({
      qualifying: 'unknown',
      observedAt: 3_000 + MOTION_FRESHNESS_MS,
    });
    await s.adapter.stop();
  });

  test('a carried pedometer value with a flat counter still does not qualify (Apple-only correctness check survives)', async () => {
    const s = setup(killSwitch());
    await s.adapter.start();
    s.emitCadence(cadenceSample(1_000, 120, 10));
    s.emitCadence(cadenceSample(2_000, 120, 10));
    expect(s.adapter.reconcile(2_000)).toMatchObject({ qualifying: false, cadencePerMinute: 120, stride: 'unknown' });
    await s.adapter.stop();
  });

  test('the raw-stream fast path disappears while Apple evidence is untouched', async () => {
    const s = setup(killSwitch());
    await s.adapter.start();
    expect(s.adapter.reconcile(500)).toMatchObject({ qualifying: 'unknown', observedAt: 500, activityAt: null, cadenceAt: null });
    expect(s.feedStride(strideSegment('walkSteady')).qualifying).toBe('unknown');
    s.emitActivity(walkingActivity(7_000));
    expect(s.adapter.reconcile(7_000)).toMatchObject({ qualifying: true, observedAt: 7_000 });
    await s.adapter.stop();
  });

  test('both plumbing fixes survive the kill switch: the clock-skew tolerance', async () => {
    const s = setup(killSwitch());
    await s.adapter.start();
    // A pedometer sample mapped a few ms ahead of the clock is an artifact and is kept at the clock.
    s.setNow(1_000);
    s.deliverCadence(cadenceSample(1_020, 96, 9));
    expect(s.adapter.reconcile(1_000)).toMatchObject({ qualifying: true, cadenceAt: 1_000, cadencePerMinute: 96 });
    // A classification whose mapped start lands after receipt is clamped, not dropped.
    s.setNow(2_000);
    s.deliverActivity({ classes: ['walking'], confidence: 'high', startedAt: 2_027, receivedAt: 2_000 });
    expect(s.adapter.reconcile(2_000)).toMatchObject({ qualifying: true, activityAt: 2_000 });
    // Beyond the tolerance the sample is broken and is dropped.
    s.setNow(3_000);
    s.deliverCadence(cadenceSample(3_000 + MOTION_CLOCK_SKEW_MS + 1, 120, 20));
    expect(s.adapter.reconcile(3_000)).toMatchObject({ cadenceAt: 1_000 });
    s.deliverActivity({ classes: ['stationary'], confidence: 'high', startedAt: 3_000 + MOTION_CLOCK_SKEW_MS + 1, receivedAt: 3_000 });
    expect(s.adapter.reconcile(3_000)).toMatchObject({ activityAt: 2_000 });
    await s.adapter.stop();
  });

  test('a seated shake that the gate vetoes qualifies again once the gate is killed', async () => {
    const gated = setup();
    await gated.adapter.start();
    gated.feedStride(strideSegment('shakeVigorous'));
    gated.emitCadence(cadenceSample(6_000, 120, 10));
    gated.emitCadence(cadenceSample(7_000, 120, 12));
    expect(gated.adapter.reconcile(7_000)).toMatchObject({ stride: 'notStride', qualifying: false, verifiedMs: 0 });
    await gated.adapter.stop();

    const killed = setup(killSwitch());
    await killed.adapter.start();
    killed.feedStride(strideSegment('shakeVigorous'));
    killed.emitCadence(cadenceSample(6_000, 120, 10));
    killed.emitCadence(cadenceSample(7_000, 120, 12));
    expect(killed.adapter.reconcile(7_000)).toMatchObject({ stride: 'unknown', qualifying: true, verifiedMs: 0 });
    await killed.adapter.stop();
  });

  test('turning the kill switch on mid-run releases the stream and turning it off resumes it', async () => {
    const s = setup();
    await s.adapter.start();
    expect(s.liveStrideListeners()).toBe(1);
    s.adapter.applyStrideGateConfig(killSwitch());
    expect(s.liveStrideListeners()).toBe(0);
    expect(s.feedStride(strideSegment('walkSteady')).stride).toBe('unknown');
    s.adapter.applyStrideGateConfig(gateOn({ stillG: 0.07 }));
    expect(s.liveStrideListeners()).toBe(1);
    let walkingAt: number | null = null;
    for (const sample of strideSegment('walkSteady')) {
      if (s.feedStride([sample]).stride === 'walking' && walkingAt === null) walkingAt = sample.t;
    }
    expect(walkingAt).not.toBeNull();
    await s.adapter.stop();
  });

  test('the stride legs are gone for every reconciliation shape the reducer uses', async () => {
    const s = setup(killSwitch());
    await s.adapter.start();
    const shapes: MotionEvidence[] = [
      s.adapter.reconcile(0),
      s.feedStride(strideSegment('treadmillSteady')),
      s.feedStride(strideSegment('shakeRotation')),
      s.adapter.reconcile(60_000),
    ];
    for (const evidence of shapes) {
      expect({ stride: evidence.stride, strideAt: evidence.strideAt, verifiedMs: evidence.verifiedMs }).toEqual({
        stride: 'unknown',
        strideAt: null,
        verifiedMs: 0,
      });
    }
    await s.adapter.stop();
  });
});
