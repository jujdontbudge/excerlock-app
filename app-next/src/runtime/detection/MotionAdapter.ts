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
import {
  SHIPPED_STRIDE_GATE_REPORT,
  sameStrideGateParams,
  type StrideGateReport,
} from './strideGateConfig';

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
 * This is an Apple-only correctness check, independent of the raw stream and of
 * every remote parameter, so it survives the stride gate's kill switch.
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
  /**
   * The raw stream has measured the phone motionless for the gate's still-stop
   * span (`stillStopMs`): a confirmed stop for the walking machine, which ends
   * relief at once instead of waiting out the silence and the grace. Never true
   * alongside qualifying evidence and never true without a live raw stream.
   */
  stopped: boolean;
};

/** Fuses raw sources once. It never converts historical steps into live relief. */
export class MotionAdapter {
  private activity: ActivitySample | null = null;
  private cadence: CadenceSample | null = null;
  private cadenceSteps: { at: number; steps: number }[] = [];
  /**
   * The raw-stream reader, or null while the kill switch is on. Null is what
   * "Apple-only" means here: no subscription, no verdict, no cadence gating.
   */
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

  /**
   * The effective gate configuration this adapter is running with: source,
   * flag key, kill switch, and every parameter as evaluated versus applied.
   * A future reader can reconstruct exactly what the gate ran with.
   */
  strideGate(): StrideGateReport {
    return this.gate;
  }

  /**
   * Applies a resolved gate configuration (`resolveStrideGateConfig` is the
   * only producer). Applying the same parameters again is a no-op, so a
   * foreground re-read never restarts an in-flight dwell; a real change resets
   * the reader, because no verdict may mix two parameter sets. The kill switch
   * drops the raw-stream subscription entirely.
   */
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
    // While the raw stream is live (an evaluated window exists), Apple's legs
    // may only corroborate a window shaped like a gait, and never one vetoed
    // now or within the last STRIDE_PENALTY_MS. The cadence leg alone released
    // relief on a seated shake (gate-proof-s1 §5.1: CMPedometer reads a shake
    // as 118-134 steps/min), and the activity leg alone kept a stopped walker in
    // relief (walk-shake-stop-w1: CMMotionActivity reported walking:high on a
    // phone measured still at 0.052 g for 17.8 s, f09377f9 +16.4 s). A gait the
    // rhythm check never confirms (8b91a77d, periodicity 0.2-0.39) is still
    // gait-shaped, so the Apple path keeps unlocking it. Without a live raw
    // stream - no source, the kill switch, a stale stream, the first window -
    // the Apple legs stand alone exactly as before the gate.
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
    if (this.analyzer === null) return;
    const assessment = this.analyzer.push(sample);
    if (assessment === null) return;
    // Publish on a verdict change, and once more when a still run reaches the
    // still-stop span: the reducer must learn of a confirmed stop without
    // waiting for the next tick.
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

  /**
   * A phone the raw stream has measured motionless for the still-stop span is
   * a confirmed stop: the silence and the grace exist to absorb Apple's own
   * 8-30 s stop lag, not a measured stillness. Still windows never corroborate,
   * so a stop can never coincide with qualifying evidence.
   */
  private confirmedStop(stride: StrideAssessment): boolean {
    return (
      stride.verdict === 'still' &&
      stride.stillSince !== null &&
      stride.at !== null &&
      stride.at - stride.stillSince >= this.gate.effective.stillStopMs
    );
  }

  /** Fresh reader for the current gate parameters; null while the kill switch is on. */
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
