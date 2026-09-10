import type {
  ActivitySample,
  CadenceSample,
  MotionAuthStatus,
  MotionProvider,
  Unsubscribe,
} from '../../engine/signals/motion/MotionProvider';
import { runCleanups } from './runCleanups';

export const MOTION_FRESHNESS_MS = 5_000;
export const MIN_WALKING_CADENCE_PER_MINUTE = 80;

export type MotionEvidence = {
  qualifying: boolean | 'unknown';
  observedAt: number;
  activityAt: number | null;
  cadenceAt: number | null;
  cadencePerMinute: number | null;
};

/** Fuses raw sources once. It never converts historical steps into live relief. */
export class MotionAdapter {
  private activity: ActivitySample | null = null;
  private cadence: CadenceSample | null = null;
  private unsubscribes: Unsubscribe[] = [];
  private listeners = new Set<(evidence: MotionEvidence) => void>();

  constructor(
    private readonly provider: MotionProvider,
    private readonly now: () => number = Date.now,
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
    await runCleanups(
      [...unsubscribes.map((unsubscribe) => () => unsubscribe()), () => this.provider.stop()],
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
    const cadenceQualifies = cadencePerMinute !== null && cadencePerMinute >= MIN_WALKING_CADENCE_PER_MINUTE;
    const supported = activityFresh || cadenceFresh;
    const activityAt = activityFresh ? this.activity!.receivedAt : null;
    const cadenceAt = cadenceFresh ? this.cadence!.asOf : null;
    return {
      qualifying: !supported ? 'unknown' : activityQualifies || cadenceQualifies,
      observedAt: supported ? Math.max(activityAt ?? -Infinity, cadenceAt ?? -Infinity) : at,
      activityAt,
      cadenceAt,
      cadencePerMinute,
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
    this.listeners.forEach((listener) => listener(evidence));
  }

  private acceptActivity(sample: ActivitySample): void {
    if (!Number.isFinite(sample.receivedAt) || sample.receivedAt < sample.startedAt || sample.receivedAt > this.now())
      return;
    if (this.activity !== null && sample.receivedAt <= this.activity.receivedAt) return;
    this.activity = sample;
    this.publish(sample.receivedAt);
  }

  private acceptCadence(sample: CadenceSample): void {
    if (
      !Number.isFinite(sample.asOf) ||
      sample.asOf > this.now() ||
      (sample.stepsPerSecond !== null && (!Number.isFinite(sample.stepsPerSecond) || sample.stepsPerSecond < 0))
    )
      return;
    if (this.cadence !== null && sample.asOf <= this.cadence.asOf) return;
    this.cadence = sample;
    this.publish(sample.asOf);
  }
}
