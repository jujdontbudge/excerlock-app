import type {
  ActivitySample,
  CadenceSample,
  MotionAuthStatus,
  MotionProvider,
  Unsubscribe,
} from '../../engine/signals/motion/MotionProvider';
import { runCleanups } from './runCleanups';
import { linkedTrace } from '@linked-trace';
import {
  StrideRhythmAnalyzer,
  UNKNOWN_STRIDE,
  type StrideAssessment,
  type StrideMotionSample,
  type StrideMotionSource,
  type StrideVerdict,
} from './StrideRhythm';

export const MOTION_FRESHNESS_MS = 5_000;
export const MIN_WALKING_CADENCE_PER_MINUTE = 80;
/**
 * Mapped Core Motion wall clocks can land a few ms after the callback receipt
 * (measured +15 ms and +27 ms on real walking classifications, +20 ms on two
 * pedometer samples): a mapping artifact, not invalid evidence. Anything
 * beyond this is a broken sample.
 */
export const MOTION_CLOCK_SKEW_MS = 250;
/**
 * `CMPedometer.currentCadence` keeps reporting the last walk's rate after the
 * walker stops (measured: 102-134 steps/min with a flat step counter for
 * 8-30 s). A cadence value therefore only counts while the pedometer's own
 * cumulative counter is still accruing steps at least at this rate over the
 * trailing horizon; real walking measured 63-152 over the same horizon, and
 * carried values with flat counters drop below 40 about 7 s after the stop.
 */
export const MIN_CADENCE_STEP_RATE_PER_MINUTE = 40;
export const CADENCE_STEP_RATE_WINDOW_MS = 10_000;

export type MotionEvidence = {
  qualifying: boolean | 'unknown';
  observedAt: number;
  activityAt: number | null;
  cadenceAt: number | null;
  cadencePerMinute: number | null;
  /** Raw-stream stride verdict at this reconciliation (`unknown` without a raw stream). */
  stride: StrideVerdict;
  strideAt: number | null;
  /** Continuously verified walking behind a `walking` stride verdict, ms (0 otherwise). */
  verifiedMs: number;
};

/** Fuses raw sources once. It never converts historical steps into live relief. */
export class MotionAdapter {
  private activity: ActivitySample | null = null;
  private cadence: CadenceSample | null = null;
  private cadenceSteps: { at: number; steps: number }[] = [];
  private readonly strideAnalyzer = new StrideRhythmAnalyzer();
  private strideVerdict: StrideVerdict = 'unknown';
  private strideUnsubscribe: Unsubscribe | null = null;
  private unsubscribes: Unsubscribe[] = [];
  private listeners = new Set<(evidence: MotionEvidence) => void>();

  constructor(
    private readonly provider: MotionProvider,
    private readonly now: () => number = Date.now,
    private readonly strideSource: StrideMotionSource | null = null,
  ) {}

  authorization(): MotionAuthStatus {
    return this.provider.getAuthorizationStatus();
  }

  requestAuthorization(): Promise<MotionAuthStatus> {
    return this.provider.requestAuthorization();
  }

  async start(): Promise<void> {
    if (this.unsubscribes.length) return;
    this.activity = null;
    this.cadence = null;
    this.cadenceSteps = [];
    this.strideAnalyzer.reset();
    this.strideVerdict = 'unknown';
    this.strideUnsubscribe = this.strideSource?.onSample((sample) => this.acceptStride(sample)) ?? null;
    this.unsubscribes = [
      this.provider.on('activity', (sample) => {
        this.acceptActivity(sample);
      }),
      this.provider.on('cadence', (sample) => {
        this.acceptCadence(sample);
      }),
    ];
    await this.provider.start();
  }

  async stop(): Promise<void> {
    const unsubscribes = this.unsubscribes.splice(0);
    const strideUnsubscribe = this.strideUnsubscribe;
    this.strideUnsubscribe = null;
    this.strideAnalyzer.reset();
    this.strideVerdict = 'unknown';
    await runCleanups(
      [
        ...(strideUnsubscribe ? [() => strideUnsubscribe()] : []),
        ...unsubscribes.map((unsubscribe) => () => unsubscribe()),
        () => this.provider.stop(),
      ],
      'Motion adapter cleanup failed',
    );
  }

  subscribe(callback: (evidence: MotionEvidence) => void): Unsubscribe {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  reconcile(at = this.now()): MotionEvidence {
    const activityAge = this.activity === null ? Infinity : at - this.activity.receivedAt;
    const cadenceAge = this.cadence === null ? Infinity : at - this.cadence.asOf;
    const activityFresh = activityAge >= 0 && activityAge < MOTION_FRESHNESS_MS;
    const cadenceFresh = cadenceAge >= 0 && cadenceAge < MOTION_FRESHNESS_MS;
    const activityQualifies =
      activityFresh &&
      (this.activity!.confidence === 'medium' || this.activity!.confidence === 'high') &&
      this.activity!.classes.some((kind) => kind === 'walking' || kind === 'running');
    const cadencePerMinute =
      cadenceFresh && this.cadence!.stepsPerSecond !== null ? this.cadence!.stepsPerSecond * 60 : null;
    const stride = this.strideAssessment(at);
    // The cadence leg alone released relief on a seated shake (gate-proof-s1
    // §5.1); it now needs the pedometer's counter to be accruing and the raw
    // stream, when it is watching, to not contradict it now or within the
    // last STRIDE_PENALTY_MS. Apple's activity classifier and the raw stride
    // verdict remain independent legs.
    const cadenceQualifies =
      cadencePerMinute !== null &&
      cadencePerMinute >= MIN_WALKING_CADENCE_PER_MINUTE &&
      this.cadenceStepsAccruing() &&
      stride.verdict !== 'notStride' &&
      stride.verdict !== 'still' &&
      !stride.recentVeto;
    const strideWalking = stride.verdict === 'walking';
    const supported = activityFresh || cadenceFresh || stride.verdict !== 'unknown';
    const activityAt = activityFresh ? this.activity!.receivedAt : null;
    const cadenceAt = cadenceFresh ? this.cadence!.asOf : null;
    // An `unknown` stride never contributes a timestamp: a silent raw stream must
    // not move the silence/grace anchor for the Apple sources.
    const strideAt = stride.verdict === 'unknown' ? null : stride.at;
    return {
      qualifying: !supported ? 'unknown' : activityQualifies || cadenceQualifies || strideWalking,
      observedAt: supported ? Math.max(activityAt ?? -Infinity, cadenceAt ?? -Infinity, strideAt ?? -Infinity) : at,
      activityAt,
      cadenceAt,
      cadencePerMinute,
      stride: stride.verdict,
      strideAt,
      verifiedMs: strideWalking && stride.since !== null && stride.at !== null ? Math.max(0, stride.at - stride.since) : 0,
    };
  }

  querySteps(fromMs: number, toMs: number): Promise<{ readonly steps: number }> {
    return this.provider.querySteps(fromMs, toMs);
  }

  queryActivity(fromMs: number, toMs: number): Promise<readonly ActivitySample[]> {
    return this.provider.queryActivity(fromMs, toMs);
  }

  /** Latest native cumulative counter, for display deltas only (never policy). */
  cumulativeSteps(): number | null {
    return this.cadence?.cumulativeSteps ?? null;
  }

  private publish(at: number): void {
    const evidence = this.reconcile(Math.max(at, this.now()));
    if (__LINKED_RECORDER_TRACE__) linkedTrace.record('motion_evidence', {
      qualifying: evidence.qualifying === 'unknown' ? 'unknown' : evidence.qualifying,
      observedAtWallMs: evidence.observedAt,
      activityAtWallMs: evidence.activityAt,
      cadenceAtWallMs: evidence.cadenceAt,
      cadencePerMinute: evidence.cadencePerMinute,
      stride: evidence.stride,
      strideAtWallMs: evidence.strideAt,
    });
    this.listeners.forEach((listener) => listener(evidence));
  }

  private acceptActivity(sample: ActivitySample): void {
    const skew = sample.startedAt - sample.receivedAt;
    const invalid =
      !Number.isFinite(sample.receivedAt) ||
      !Number.isFinite(sample.startedAt) ||
      skew > MOTION_CLOCK_SKEW_MS ||
      sample.receivedAt > this.now();
    if (invalid) {
      if (__LINKED_RECORDER_TRACE__) linkedTrace.record('motion_input_js', { stream: 'activity', status: 'rejected', reason: 'invalid_time', sourceAtWallMs: sample.receivedAt });
      return;
    }
    if (this.activity !== null && sample.receivedAt <= this.activity.receivedAt) {
      if (__LINKED_RECORDER_TRACE__) linkedTrace.record('motion_input_js', { stream: 'activity', status: 'rejected', reason: 'stale', sourceAtWallMs: sample.receivedAt });
      return;
    }
    if (__LINKED_RECORDER_TRACE__) linkedTrace.record('motion_input_js', { stream: 'activity', status: 'accepted', sourceAtWallMs: sample.receivedAt });
    // A classification cannot have started after it was delivered; clamp the
    // mapping artifact instead of discarding a real walking sample.
    this.activity = skew > 0 ? { ...sample, startedAt: sample.receivedAt } : sample;
    this.publish(sample.receivedAt);
  }

  private acceptCadence(received: CadenceSample): void {
    const now = this.now();
    const skew = received.asOf - now;
    const invalid =
      !Number.isFinite(received.asOf) ||
      skew > MOTION_CLOCK_SKEW_MS ||
      (received.stepsPerSecond !== null && (!Number.isFinite(received.stepsPerSecond) || received.stepsPerSecond < 0));
    if (invalid) {
      if (__LINKED_RECORDER_TRACE__) linkedTrace.record('motion_input_js', { stream: 'cadence', status: 'rejected', reason: 'invalid_value', sourceAtWallMs: received.asOf });
      return;
    }
    // The pedometer's `endDate` cannot be after its delivery; clamp the mapping artifact.
    const sample = skew > 0 ? { ...received, asOf: now } : received;
    if (this.cadence !== null && sample.asOf <= this.cadence.asOf) {
      if (__LINKED_RECORDER_TRACE__) linkedTrace.record('motion_input_js', { stream: 'cadence', status: 'rejected', reason: 'stale', sourceAtWallMs: sample.asOf });
      return;
    }
    if (__LINKED_RECORDER_TRACE__) linkedTrace.record('motion_input_js', { stream: 'cadence', status: 'accepted', sourceAtWallMs: sample.asOf });
    this.cadence = sample;
    this.cadenceSteps.push({ at: sample.asOf, steps: sample.cumulativeSteps });
    // Keep the newest sample at or beyond the horizon as the baseline so the
    // rate always spans at least the horizon once enough history exists.
    const horizon = sample.asOf - CADENCE_STEP_RATE_WINDOW_MS;
    while (this.cadenceSteps.length >= 2 && this.cadenceSteps[1].at <= horizon) this.cadenceSteps.shift();
    this.publish(sample.asOf);
  }

  /** The first cadence sample has no baseline to contradict it; later ones must show steps accruing. */
  private cadenceStepsAccruing(): boolean {
    const baseline = this.cadenceSteps[0];
    const latest = this.cadenceSteps[this.cadenceSteps.length - 1];
    if (baseline === undefined || latest === undefined || baseline === latest) return true;
    const spanMs = latest.at - baseline.at;
    if (spanMs <= 0) return true;
    return ((latest.steps - baseline.steps) / spanMs) * 60_000 >= MIN_CADENCE_STEP_RATE_PER_MINUTE;
  }

  private acceptStride(sample: StrideMotionSample): void {
    const assessment = this.strideAnalyzer.push(sample);
    if (assessment === null || assessment.verdict === this.strideVerdict) return;
    this.strideVerdict = assessment.verdict;
    this.publish(sample.t);
  }

  private strideAssessment(at: number): StrideAssessment {
    if (this.strideSource === null) return UNKNOWN_STRIDE;
    return this.strideAnalyzer.assessmentAt(at);
  }
}
