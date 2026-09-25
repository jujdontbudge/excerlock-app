import type {
  ActivitySample,
  CadenceSample,
  MotionAuthStatus,
  MotionProvider,
  Unsubscribe,
} from '../motion/MotionProvider';
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
import {
  SHIPPED_STRIDE_GATE_REPORT,
  sameStrideGateParams,
  type StrideGateReport,
} from './strideGateConfig';

export const MOTION_FRESHNESS_MS = 5_000;
export const MIN_WALKING_CADENCE_PER_MINUTE = 80;
export const MOTION_CLOCK_SKEW_MS = 250;
export const MIN_CADENCE_STEP_RATE_PER_MINUTE = 40;
export const CADENCE_STEP_RATE_WINDOW_MS = 10_000;

export type MotionEvidence = {
  qualifying: boolean | 'unknown';
  observedAt: number;
  activityAt: number | null;
  cadenceAt: number | null;
  cadencePerMinute: number | null;
  stride: StrideVerdict;
  strideAt: number | null;
  verifiedMs: number;
  stopped: boolean;
};

export class MotionAdapter {
  private activity: ActivitySample | null = null;
  private cadence: CadenceSample | null = null;
  private cadenceSteps: { at: number; steps: number }[] = [];
  private analyzer: StrideRhythmAnalyzer | null;
  private gate: StrideGateReport;
  private strideVerdict: StrideVerdict = 'unknown';
  private strideStopped = false;
  private strideUnsubscribe: Unsubscribe | null = null;
  private started = false;
  private unsubscribes: Unsubscribe[] = [];
  private listeners = new Set<(evidence: MotionEvidence) => void>();

  constructor(
    private readonly provider: MotionProvider,
    private readonly now: () => number = Date.now,
    private readonly strideSource: StrideMotionSource | null = null,
    gate: StrideGateReport = SHIPPED_STRIDE_GATE_REPORT,
  ) {
    this.gate = gate;
    this.analyzer = gate.killSwitch.applied ? null : new StrideRhythmAnalyzer(gate.effective);
  }

  strideGate(): StrideGateReport {
    return this.gate;
  }

  applyStrideGateConfig(report: StrideGateReport): void {
    const unchanged =
      sameStrideGateParams(this.gate.effective, report.effective) &&
      this.gate.killSwitch.applied === report.killSwitch.applied;
    this.gate = report;
    if (unchanged) return;
    this.resetStride();
    if (this.analyzer === null) this.detachStride();
    else if (this.started) this.attachStride();
  }

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
    this.started = true;
    this.resetStride();
    this.attachStride();
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
    this.started = false;
    this.resetStride();
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
    const activityWalking =
      activityFresh &&
      (this.activity!.confidence === 'medium' || this.activity!.confidence === 'high') &&
      this.activity!.classes.some((kind) => kind === 'walking' || kind === 'running');
    const cadencePerMinute =
      cadenceFresh && this.cadence!.stepsPerSecond !== null ? this.cadence!.stepsPerSecond * 60 : null;
    const stride = this.strideAssessment(at);
    const rawLive = stride.features !== null;
    const corroborated = !rawLive || (stride.gaitLike && !stride.recentVeto);
    const activityQualifies = activityWalking && corroborated;
    const cadenceQualifies =
      cadencePerMinute !== null &&
      cadencePerMinute >= MIN_WALKING_CADENCE_PER_MINUTE &&
      this.cadenceStepsAccruing() &&
      corroborated;
    const strideWalking = stride.verdict === 'walking';
    const stopped = this.confirmedStop(stride);
    const supported = activityFresh || cadenceFresh || stride.verdict !== 'unknown';
    const activityAt = activityFresh ? this.activity!.receivedAt : null;
    const cadenceAt = cadenceFresh ? this.cadence!.asOf : null;
    const strideAt = stride.verdict === 'unknown' ? null : stride.at;
    return {
      qualifying: !supported ? 'unknown' : activityQualifies || cadenceQualifies || strideWalking,
      observedAt: supported ? Math.max(activityAt ?? -Infinity, cadenceAt ?? -Infinity, strideAt ?? -Infinity) : at,
      activityAt,
      cadenceAt,
      cadencePerMinute,
      stride: stride.verdict,
      strideAt,
      verifiedMs: strideWalking && stride.since !== null && stride.at !== null
      ? Math.min(this.gate.effective.qualifyCreditMs, Math.max(0, stride.at - stride.since))
      : 0,
      stopped,
    };
  }

  querySteps(fromMs: number, toMs: number): Promise<{ readonly steps: number }> {
    return this.provider.querySteps(fromMs, toMs);
  }

  queryActivity(fromMs: number, toMs: number): Promise<readonly ActivitySample[]> {
    return this.provider.queryActivity(fromMs, toMs);
  }

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
      verifiedMs: evidence.verifiedMs,
      stopped: evidence.stopped,
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
    const sample = skew > 0 ? { ...received, asOf: now } : received;
    if (this.cadence !== null && sample.asOf <= this.cadence.asOf) {
      if (__LINKED_RECORDER_TRACE__) linkedTrace.record('motion_input_js', { stream: 'cadence', status: 'rejected', reason: 'stale', sourceAtWallMs: sample.asOf });
      return;
    }
    if (__LINKED_RECORDER_TRACE__) linkedTrace.record('motion_input_js', { stream: 'cadence', status: 'accepted', sourceAtWallMs: sample.asOf });
    this.cadence = sample;
    this.cadenceSteps.push({ at: sample.asOf, steps: sample.cumulativeSteps });
    const horizon = sample.asOf - CADENCE_STEP_RATE_WINDOW_MS;
    while (this.cadenceSteps.length >= 2 && this.cadenceSteps[1].at <= horizon) this.cadenceSteps.shift();
    this.publish(sample.asOf);
  }

  private cadenceStepsAccruing(): boolean {
    const baseline = this.cadenceSteps[0];
    const latest = this.cadenceSteps[this.cadenceSteps.length - 1];
    if (baseline === undefined || latest === undefined || baseline === latest) return true;
    const spanMs = latest.at - baseline.at;
    if (spanMs <= 0) return true;
    return ((latest.steps - baseline.steps) / spanMs) * 60_000 >= MIN_CADENCE_STEP_RATE_PER_MINUTE;
  }

  private acceptStride(sample: StrideMotionSample): void {
    if (this.analyzer === null) return;
    const assessment = this.analyzer.push(sample);
    if (assessment === null) return;
    const stopped = this.confirmedStop(assessment);
    if (assessment.verdict === this.strideVerdict && stopped === this.strideStopped) return;
    this.strideVerdict = assessment.verdict;
    this.strideStopped = stopped;
    this.publish(sample.t);
  }

  private strideAssessment(at: number): StrideAssessment {
    if (this.strideSource === null || this.analyzer === null) return UNKNOWN_STRIDE;
    return this.analyzer.assessmentAt(at);
  }

  private confirmedStop(stride: StrideAssessment): boolean {
    return (
      stride.verdict === 'still' &&
      stride.stillSince !== null &&
      stride.at !== null &&
      stride.at - stride.stillSince >= this.gate.effective.stillStopMs
    );
  }

  private resetStride(): void {
    this.analyzer = this.gate.killSwitch.applied ? null : new StrideRhythmAnalyzer(this.gate.effective);
    this.strideVerdict = 'unknown';
    this.strideStopped = false;
  }

  private attachStride(): void {
    if (!this.started || this.strideUnsubscribe !== null || this.analyzer === null) return;
    this.strideUnsubscribe = this.strideSource?.onSample((sample) => this.acceptStride(sample)) ?? null;
  }

  private detachStride(): void {
    const unsubscribe = this.strideUnsubscribe;
    this.strideUnsubscribe = null;
    unsubscribe?.();
  }
}
