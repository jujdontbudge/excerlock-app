import golden from './fixtures/strideGateShippedTrace.json';
import { MotionAdapter, type MotionEvidence } from '../MotionAdapter';
import { StrideRhythmAnalyzer, type StrideMotionSample } from '../StrideRhythm';
import { SHIPPED_STRIDE_GATE, type StrideGateParams } from '../strideGateConfig';
import { strideSegment } from './strideFixtures';
import type { ActivitySample, CadenceSample, MotionProvider } from '../../../engine/signals/motion/MotionProvider';

/**
 * The shipped defaults are byte-identical to the gate that landed at aa293011.
 *
 * `fixtures/strideGateShippedTrace.json` holds the analyzer assessments and the
 * adapter `MotionEvidence` the *pre-configuration* implementation produced on
 * every capture segment (see the fixture's `generator`). These tests replay the
 * captures through the current code with no remote configuration at all - the
 * default constructors, exactly what a flag-less app runs - and require an exact
 * match, down to every feature value. If a threshold or a formula drifts, the
 * diff names the capture and the row.
 *
 * Regenerate deliberately (only when a code change to the gate itself is
 * intended): copy `StrideRhythm.ts` and `MotionAdapter.ts` from aa293011 into a
 * scratch test, push the same segments through both copies, and rewrite this
 * fixture from the old output.
 */

const CAPTURES = ['walkSteady', 'treadmillSteady', 'walkColdStart', 'shakeVigorous', 'shakeRotation', 'shakeSlowTail', 'shakeShort', 'sittingStill'] as const;
type Capture = (typeof CAPTURES)[number];

const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

/** Every non-null assessment the analyzer publishes, with the sample time. */
function analyzerTrace(params: StrideGateParams | undefined, capture: Capture) {
  const analyzer = params === undefined ? new StrideRhythmAnalyzer() : new StrideRhythmAnalyzer(params);
  const rows: unknown[] = [];
  for (const sample of strideSegment(capture)) {
    const assessment = analyzer.push(sample);
    if (assessment === null) continue;
    rows.push(clone({ t: sample.t, ...assessment }));
  }
  return rows;
}

function createHarness() {
  let now = 0;
  const activity = new Set<(value: ActivitySample) => void>();
  const cadence = new Set<(value: CadenceSample) => void>();
  const stride = new Set<(value: StrideMotionSample) => void>();
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
    onSample: (callback: (value: StrideMotionSample) => void) => {
      stride.add(callback);
      return () => {
        stride.delete(callback);
      };
    },
  };
  return {
    provider,
    strideSource,
    cadence,
    stride,
    now: () => now,
    setNow: (value: number) => {
      now = value;
    },
  };
}

/** The capture end-to-end through the adapter: published evidence plus the final reconcile. */
async function adapterTrace(capture: Capture) {
  const harness = createHarness();
  const adapter = new MotionAdapter(harness.provider, harness.now, harness.strideSource);
  const published: unknown[] = [];
  await adapter.start();
  adapter.subscribe((evidence) => published.push(clone(evidence)));
  const samples = strideSegment(capture);
  const end = samples[samples.length - 1].t;
  let steps = 0;
  // The same 130 steps/min pedometer the fixture was recorded with: a hostile
  // Apple leg that must not change what the raw gate contributes.
  for (let at = Math.max(0, end - 9_000); at <= end; at += 1_000) {
    harness.setNow(Math.max(harness.now(), at));
    const sample: CadenceSample = { stepsPerSecond: 130 / 60, cumulativeSteps: Math.round(steps), asOf: at };
    harness.cadence.forEach((callback) => callback(sample));
    steps += 130 / 60;
  }
  harness.setNow(Math.max(harness.now(), end));
  for (const sample of samples) harness.stride.forEach((callback) => callback(sample));
  harness.setNow(Math.max(harness.now(), end));
  published.push(clone(adapter.reconcile(harness.now())));
  await adapter.stop();
  return published;
}

describe('the shipped gate is byte-identical to the pre-configuration implementation', () => {
  test('the fixture covers every capture, analyzer and adapter', () => {
    for (const capture of CAPTURES) {
      expect(golden.captures[capture].length).toBeGreaterThan(0);
      expect(golden.adapters[capture].length).toBeGreaterThan(0);
    }
    // The decoys the gate exists for are in the fixture and carry no walk.
    const decoyVerdicts = golden.captures.shakeVigorous.map((row) => (row as { verdict: string }).verdict);
    expect(decoyVerdicts).not.toContain('walking');
    const walkVerdicts = golden.captures.walkSteady.map((row) => (row as { verdict: string }).verdict);
    expect(walkVerdicts).toContain('walking');
  });

  test.each(CAPTURES)('%s: the default analyzer replays the recorded trace exactly', (capture) => {
    expect(analyzerTrace(undefined, capture)).toEqual(golden.captures[capture]);
  });

  test.each(CAPTURES)('%s: an explicit shipped-parameter analyzer produces the same trace', (capture) => {
    expect(analyzerTrace(SHIPPED_STRIDE_GATE, capture)).toEqual(golden.captures[capture]);
  });

  test.each(CAPTURES)('%s: a default-constructed adapter publishes the recorded evidence exactly', async (capture) => {
    expect(await adapterTrace(capture)).toEqual(golden.adapters[capture]);
  });

  test('the shipped gate never publishes a walk on a decoy and always does on a walk', () => {
    for (const capture of ['shakeVigorous', 'shakeRotation', 'shakeSlowTail', 'shakeShort', 'sittingStill'] as const) {
      expect(`${capture}: ${analyzerTrace(undefined, capture).some((row) => (row as { verdict: string }).verdict === 'walking')}`).toBe(`${capture}: false`);
    }
    for (const capture of ['walkSteady', 'treadmillSteady', 'walkColdStart'] as const) {
      expect(`${capture}: ${analyzerTrace(undefined, capture).some((row) => (row as { verdict: string }).verdict === 'walking')}`).toBe(`${capture}: true`);
    }
  });

  test('the recorded adapter traces carry the qualifying evidence the reducer needs', () => {
    const walk = golden.adapters.walkSteady as MotionEvidence[];
    expect(walk.some((row) => row.stride === 'walking' && row.verifiedMs > 0)).toBe(true);
    const shake = golden.adapters.shakeVigorous as MotionEvidence[];
    expect(shake.some((row) => row.stride === 'walking' || row.verifiedMs > 0)).toBe(false);
  });
});
