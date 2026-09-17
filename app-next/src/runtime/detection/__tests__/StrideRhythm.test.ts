import {
  STRIDE_PENALTY_MS,
  STRIDE_STALENESS_MS,
  STRIDE_WALK_DWELL,
  STRIDE_WINDOW_MS,
  StrideRhythmAnalyzer,
  classifyStrideWindow,
  type StrideAssessment,
  type StrideFeatures,
  type StrideMotionSample,
  type StrideVerdict,
} from '../StrideRhythm';
import { pureVerticalOscillation, stillSamples, strideSegment } from './strideFixtures';

type Trace = { t: number; verdict: StrideVerdict; assessment: StrideAssessment }[];

function run(samples: readonly StrideMotionSample[]): { trace: Trace; analyzer: StrideRhythmAnalyzer } {
  const analyzer = new StrideRhythmAnalyzer();
  const trace: Trace = [];
  for (const sample of samples) {
    const assessment = analyzer.push(sample);
    if (assessment) trace.push({ t: sample.t, verdict: assessment.verdict, assessment });
  }
  return { trace, analyzer };
}

const verdicts = (trace: Trace) => new Set(trace.map((row) => row.verdict));
const firstVerdictAt = (trace: Trace, verdict: StrideVerdict) => trace.find((row) => row.verdict === verdict)?.t ?? null;

const walkingFeatures: StrideFeatures = {
  windowMs: 3000, verticalRms: 0.3, recentRms: 0.3, periodicity: 0.7, stepHz: 1.8, intervalCv: 0.1, axisPurity: 0.75, rotationRms: 0.5, rotationRatio: 1.7,
};

describe('classifyStrideWindow', () => {
  test('a walking window is a stride; a window whose newest second has stopped is not', () => {
    expect(classifyStrideWindow(walkingFeatures)).toBe('stride');
    expect(classifyStrideWindow({ ...walkingFeatures, recentRms: 0.04 })).toBe('ambiguous');
  });
  test('one-dimensional, too fast, or rotation-dominated periodic motion is non-gait', () => {
    expect(classifyStrideWindow({ ...walkingFeatures, axisPurity: 0.95 })).toBe('nonGait');
    expect(classifyStrideWindow({ ...walkingFeatures, stepHz: 2.6 })).toBe('nonGait');
    expect(classifyStrideWindow({ ...walkingFeatures, rotationRms: 2.5, rotationRatio: 9 })).toBe('nonGait');
  });
  test('a twisted phone is non-gait even without periodicity; a still phone is still', () => {
    expect(classifyStrideWindow({ ...walkingFeatures, periodicity: 0.2, verticalRms: 0.12, recentRms: 0.12, rotationRms: 1.5, rotationRatio: 12 })).toBe('nonGait');
    expect(classifyStrideWindow({ ...walkingFeatures, periodicity: 0.2 })).toBe('ambiguous');
    expect(classifyStrideWindow({ ...walkingFeatures, verticalRms: 0.03, recentRms: 0.03 })).toBe('still');
  });
});

describe('real captures: walking and treadmill', () => {
  test('a steady hand-held walk is confirmed within five seconds and stays confirmed', () => {
    const { trace } = run(strideSegment('walkSteady'));
    const at = firstVerdictAt(trace, 'walking');
    expect(at).not.toBeNull();
    expect(at!).toBeLessThanOrEqual(STRIDE_WINDOW_MS + (STRIDE_WALK_DWELL - 1) * 250 + 100);
    expect(trace.filter((row) => row.t >= at!).every((row) => row.verdict === 'walking')).toBe(true);
    const last = trace[trace.length - 1].assessment;
    expect(last.since).toBeLessThanOrEqual(300);
    expect(last.features!.stepHz).toBeGreaterThan(1.4);
    expect(last.features!.stepHz).toBeLessThan(2.2);
  });
  test('treadmill walking with the phone in hand is confirmed within five seconds', () => {
    const { trace } = run(strideSegment('treadmillSteady'));
    const at = firstVerdictAt(trace, 'walking');
    expect(at).not.toBeNull();
    expect(at!).toBeLessThanOrEqual(5000);
    expect(verdicts(trace).has('notStride')).toBe(false);
  });
  test('a walk from a standing start is confirmed once the gait settles, without any veto on the way', () => {
    const { trace } = run(strideSegment('walkColdStart'));
    const at = firstVerdictAt(trace, 'walking');
    expect(at).not.toBeNull();
    expect(at!).toBeLessThanOrEqual(7500);
    expect(trace.filter((row) => row.t < at!).every((row) => row.verdict === 'unknown' || row.verdict === 'still')).toBe(true);
    expect(trace[trace.length - 1].assessment.since).toBeLessThan(at! - STRIDE_WINDOW_MS);
  });
});

describe('real captures: seated shaking never becomes walking', () => {
  test.each(['shakeVigorous', 'shakeRotation', 'shakeSlowTail', 'shakeShort'] as const)('%s', (name) => {
    const { trace } = run(strideSegment(name));
    expect(verdicts(trace).has('walking')).toBe(false);
  });
  test.each(['shakeVigorous', 'shakeRotation', 'shakeShort'] as const)('%s is vetoed as non-gait', (name) => {
    expect(verdicts(run(strideSegment(name)).trace).has('notStride')).toBe(true);
  });
  test('a shake that dies out ends in a still verdict, not a walking one', () => {
    const { trace } = run(strideSegment('shakeSlowTail'));
    expect(trace[trace.length - 1].verdict).toBe('still');
  });
  test('a non-gait verdict keeps a recent-veto flag for the penalty window, then releases it', () => {
    const { trace, analyzer } = run([...strideSegment('shakeVigorous'), ...stillSamples(6020, STRIDE_PENALTY_MS + 5000)]);
    const lastVeto = [...trace].reverse().find((row) => row.verdict === 'notStride')!;
    const inPenalty = trace.filter((row) => row.t >= lastVeto.t && row.t < lastVeto.t + STRIDE_PENALTY_MS);
    const afterPenalty = trace.filter((row) => row.t >= lastVeto.t + STRIDE_PENALTY_MS);
    expect(inPenalty.every((row) => row.assessment.recentVeto)).toBe(true);
    expect(afterPenalty.length).toBeGreaterThan(0);
    expect(afterPenalty.every((row) => !row.assessment.recentVeto && row.verdict === 'still')).toBe(true);
    expect(analyzer.assessmentAt(trace[trace.length - 1].t).recentVeto).toBe(false);
  });
});

describe('still phones and synthetic shakes', () => {
  test('a real sitting capture and a synthetic still phone are still, never walking', () => {
    for (const samples of [strideSegment('sittingStill'), stillSamples(0, 8000)]) {
      const { trace } = run(samples);
      expect(verdicts(trace).has('walking')).toBe(false);
      expect(trace[trace.length - 1].verdict).toBe('still');
    }
  });
  test('a metronomic one-dimensional 2 Hz oscillation is vetoed as non-gait', () => {
    const { trace } = run(pureVerticalOscillation(0, 8000, 2.0, 0.3));
    expect(verdicts(trace).has('walking')).toBe(false);
    expect(verdicts(trace).has('notStride')).toBe(true);
  });
  test('assessments go stale two seconds after the last sample and reset clears everything', () => {
    const { trace, analyzer } = run(strideSegment('walkSteady'));
    const last = trace[trace.length - 1];
    expect(analyzer.assessmentAt(last.t).verdict).toBe('walking');
    expect(analyzer.assessmentAt(last.t + STRIDE_STALENESS_MS - 1).verdict).toBe('walking');
    expect(analyzer.assessmentAt(last.t + STRIDE_STALENESS_MS).verdict).toBe('unknown');
    expect(analyzer.assessmentAt(last.t - 1).verdict).toBe('unknown');
    analyzer.reset();
    expect(analyzer.assessmentAt(last.t).verdict).toBe('unknown');
    expect(analyzer.push(strideSegment('walkSteady', last.t + 1000)[0])).toMatchObject({ verdict: 'unknown', features: null, since: null });
  });
  test('samples that move backwards in time are ignored', () => {
    const analyzer = new StrideRhythmAnalyzer();
    const samples = strideSegment('walkSteady');
    for (const sample of samples.slice(0, 200)) analyzer.push(sample);
    expect(analyzer.push({ ...samples[10], t: samples[10].t })).toBeNull();
    const at = analyzer.assessmentAt(samples[199].t).at!;
    expect(at).toBeLessThanOrEqual(samples[199].t);
    expect(at).toBeGreaterThan(samples[199].t - 250);
  });
});
