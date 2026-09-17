import { MotionAdapter, type MotionEvidence } from '../MotionAdapter';
import type { ActivitySample, CadenceSample, MotionProvider } from '../../../engine/signals/motion/MotionProvider';
import { StrideRhythmAnalyzer, type StrideMotionSample, type StrideWindowClass } from '../StrideRhythm';
import {
  SHIPPED_STRIDE_GATE,
  SHIPPED_STRIDE_GATE_REPORT,
  STRIDE_GATE_FIELDS,
  STRIDE_GATE_FIELD_SPECS,
  resolveStrideGateConfig,
  type StrideGateParams,
  type StrideGateReport,
} from '../strideGateConfig';
import { strideSegment, type StrideSegmentName } from './strideFixtures';

const WALK_CAPTURES: readonly StrideSegmentName[] = ['walkSteady', 'treadmillSteady', 'walkColdStart'];
/** Every capture the shipped gate never confirms a walk on: shakes and a sitting phone. */
const DECOY_CAPTURES: readonly StrideSegmentName[] = ['shakeVigorous', 'shakeRotation', 'shakeSlowTail', 'shakeShort', 'sittingStill'];

/**
 * The payloads that sit exactly on the clamps' dangerous and safe endpoints.
 * `hostile` drives every field to the endpoint that makes the gate most likely
 * to accept fake walking (more permissive floors, a wider band, a shorter
 * dwell, a longer-lived verdict); `strict` drives each field the other way.
 * The two coupled pairs are repaired to the strictest *admissible* values,
 * because the invariants reject the raw combination.
 */
function extremePayload(direction: 'hostile' | 'strict'): Record<string, number> {
  const payload: Record<string, number> = {};
  for (const field of STRIDE_GATE_FIELDS) {
    const { clamp, hostile } = STRIDE_GATE_FIELD_SPECS[field];
    payload[field] = direction === 'hostile' ? hostile : clamp[0] === hostile ? clamp[1] : clamp[0];
  }
  if (direction === 'strict') {
    // dwell x interval <= 12 s, and the span floor must stay inside the window.
    if (payload.walkDwell * payload.evaluationIntervalMs > 12_000) payload.walkDwell = Math.floor(12_000 / payload.evaluationIntervalMs);
    const windowMs = payload.windowMs ?? SHIPPED_STRIDE_GATE.windowMs;
    if (payload.minSpanMs > windowMs - 20) payload.minSpanMs = windowMs - 20;
  }
  return payload;
}

const acceptedPayload = (direction: 'hostile' | 'strict'): StrideGateReport => {
  const payload = extremePayload(direction);
  const report = resolveStrideGateConfig({ payload });
  if (report.source !== 'remote') throw new Error(`${direction} payload rejected: ${report.reason}`);
  return report;
};

const HOSTILE = acceptedPayload('hostile');
const STRICT = acceptedPayload('strict');

type Trace = { walking: number; notStride: number; still: number; windows: StrideWindowClass[]; longestStrideRun: number };

function traceWith(params: StrideGateParams, capture: StrideSegmentName): Trace {
  const analyzer = new StrideRhythmAnalyzer(params);
  const trace: Trace = { walking: 0, notStride: 0, still: 0, windows: [], longestStrideRun: 0 };
  let runLength = 0;
  for (const sample of strideSegment(capture)) {
    const assessment = analyzer.push(sample);
    if (assessment === null) continue;
    if (assessment.verdict === 'walking') trace.walking += 1;
    if (assessment.verdict === 'notStride') trace.notStride += 1;
    if (assessment.verdict === 'still') trace.still += 1;
    if (assessment.windowClass !== null) trace.windows.push(assessment.windowClass);
    runLength = assessment.windowClass === 'stride' ? runLength + 1 : 0;
    trace.longestStrideRun = Math.max(trace.longestStrideRun, runLength);
  }
  return trace;
}

function createHarness(report: StrideGateReport) {
  let now = 0;
  const activity = new Set<(v: ActivitySample) => void>();
  const cadence = new Set<(v: CadenceSample) => void>();
  const stride = new Set<(v: StrideMotionSample) => void>();
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
  const adapter = new MotionAdapter(provider, () => now, { onSample: (callback) => {
    stride.add(callback);
    return () => { stride.delete(callback); };
  } }, report);
  return {
    adapter,
    setNow: (value: number) => { now = value; },
    emitActivity: (value: ActivitySample) => { now = Math.max(now, value.receivedAt); activity.forEach((f) => f(value)); },
    emitCadence: (value: CadenceSample) => { now = Math.max(now, value.asOf); cadence.forEach((f) => f(value)); },
    emitStride: (samples: readonly StrideMotionSample[]) => {
      for (const sample of samples) {
        now = Math.max(now, sample.t);
        stride.forEach((f) => f(sample));
      }
    },
  };
}

/** The s1 scenario: the pedometer counts a seated shake or a carried phone at this rate with steps accruing. */
function hostilePedometer(harness: ReturnType<typeof createHarness>, fromMs: number, toMs: number, perMinute: number) {
  const stepsPerSample = perMinute / 60;
  let steps = 0;
  for (let at = fromMs; at <= toMs; at += 1_000) {
    harness.emitCadence({ stepsPerSecond: perMinute / 60, cumulativeSteps: Math.round(steps), asOf: at });
    steps += stepsPerSample;
  }
}

async function evidenceFor(report: StrideGateReport, capture: StrideSegmentName, pedometerPerMinute: number): Promise<MotionEvidence[]> {
  const harness = createHarness(report);
  await harness.adapter.start();
  const published: MotionEvidence[] = [];
  harness.adapter.subscribe((evidence) => published.push(evidence));
  const samples = strideSegment(capture);
  const end = samples[samples.length - 1].t;
  hostilePedometer(harness, Math.max(0, end - 9_000), end, pedometerPerMinute);
  harness.emitStride(samples);
  published.push(harness.adapter.reconcile(end));
  await harness.adapter.stop();
  return published;
}

describe('the clamp endpoints really are the endpoints', () => {
  test('the hostile payload sits on every clamp’s dangerous endpoint', () => {
    const payload = extremePayload('hostile');
    for (const field of STRIDE_GATE_FIELDS) expect(`${field}=${payload[field]}`).toBe(`${field}=${STRIDE_GATE_FIELD_SPECS[field].hostile}`);
    expect(HOSTILE.source).toBe('remote');
  });

  test('the strict payload sits on the other endpoint and stays admissible', () => {
    const payload = extremePayload('strict');
    for (const field of STRIDE_GATE_FIELDS) {
      const [min, max] = STRIDE_GATE_FIELD_SPECS[field].clamp;
      const expected = STRIDE_GATE_FIELD_SPECS[field].hostile === min ? max : min;
      const coupled = field === 'walkDwell' || field === 'minSpanMs';
      if (!coupled) expect(`${field}=${payload[field]}`).toBe(`${field}=${expected}`);
      else expect(`${field} in range=${payload[field] >= min && payload[field] <= max}`).toBe(`${field} in range=true`);
    }
    expect(STRICT.source).toBe('remote');
  });
});

describe('the loosest admissible payload still never vouches for a decoy', () => {
  test.each(DECOY_CAPTURES)('%s yields no walking verdict', (capture) => {
    expect(traceWith(HOSTILE.effective, capture).walking).toBe(0);
  });

  test('a sitting phone never even reaches the stride class under the loosest payload', () => {
    const trace = traceWith(HOSTILE.effective, 'sittingStill');
    expect(trace.windows).not.toContain('stride');
    expect(trace.longestStrideRun).toBe(0);
  });

  test('the hostile envelope cannot add an unlock the shipped gate would not give', async () => {
    for (const capture of ['shakeVigorous', 'shakeSlowTail', 'sittingStill'] as const) {
      const shipped = await evidenceFor(SHIPPED_STRIDE_GATE_REPORT, capture, 130);
      const hostile = await evidenceFor(HOSTILE, capture, 130);
      expect(`${capture}: ${hostile.some((row) => row.stride === 'walking' || row.verifiedMs > 0)}`).toBe(`${capture}: false`);
      expect(`${capture}: ${hostile.some((row) => row.qualifying === true)}`).toBe(`${capture}: ${shipped.some((row) => row.qualifying === true)}`);
    }
  });
});

describe('the loosest admissible payload still confirms a real walk', () => {
  test.each(WALK_CAPTURES)('%s is still confirmed', (capture) => {
    expect(traceWith(HOSTILE.effective, capture).walking).toBeGreaterThan(0);
  });

  test('a real walk under the loosest payload still unlocks through the adapter', async () => {
    const published = await evidenceFor(HOSTILE, 'walkSteady', 0);
    expect(published.some((row) => row.stride === 'walking' && row.qualifying === true)).toBe(true);
  });
});

describe('the strictest admissible payload cannot block a real walk', () => {
  test.each(WALK_CAPTURES)('%s is never vetoed or called still', (capture) => {
    const trace = traceWith(STRICT.effective, capture);
    expect(`${capture}: vetoes=${trace.notStride} still=${trace.still}`).toBe(`${capture}: vetoes=0 still=0`);
  });

  test('the Apple legs keep unlocking while the strictest payload is active', async () => {
    const harness = createHarness(STRICT);
    await harness.adapter.start();
    harness.emitStride(strideSegment('walkSteady'));
    harness.emitActivity({ classes: ['walking'], confidence: 'high', startedAt: 5_000, receivedAt: 5_000 });
    expect(harness.adapter.reconcile(5_000)).toMatchObject({ qualifying: true, activityAt: 5_000 });
    hostilePedometer(harness, 6_000, 9_000, 120);
    const cadence = harness.adapter.reconcile(9_000);
    expect(cadence.qualifying).toBe(true);
    expect(cadence.stride).not.toBe('notStride');
    expect(cadence.stride).not.toBe('still');
    await harness.adapter.stop();
  });

  test('a strict payload that parks the leg still leaves the pedometer leg alone', async () => {
    // A dwell the captures cannot reach inside one segment: the gate never
    // confirms, and it must never turn that silence into a veto.
    const parked = resolveStrideGateConfig({ payload: { ...extremePayload('strict'), evaluationIntervalMs: 1_000, walkDwell: 12 } });
    expect(parked.source).toBe('remote');
    const trace = traceWith(parked.effective, 'walkSteady');
    expect(`${trace.walking} vetoes=${trace.notStride} still=${trace.still}`).toBe('0 vetoes=0 still=0');
  });
});
