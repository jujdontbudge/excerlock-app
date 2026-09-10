import type {
  ActivitySample,
  CadenceSample,
  MotionAuthStatus,
  MotionProvider,
  Unsubscribe,
} from '../../engine/signals/motion/MotionProvider';

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
    this.unsubscribes = [
      this.provider.on('activity', (sample) => {
        this.activity = sample;
        this.publish(sample.receivedAt);
      }),
      this.provider.on('cadence', (sample) => {
        this.cadence = sample;
        this.publish(sample.asOf);
      }),
    ];
    await this.provider.start();
  }

  async stop(): Promise<void> {
    this.unsubscribes.splice(0).forEach((unsubscribe) => unsubscribe());
    await this.provider.stop();
  }

  subscribe(callback: (evidence: MotionEvidence) => void): Unsubscribe {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  reconcile(at = this.now()): MotionEvidence {
    const activityFresh = this.activity !== null && at - this.activity.receivedAt <= MOTION_FRESHNESS_MS;
    const cadenceFresh = this.cadence !== null && at - this.cadence.asOf <= MOTION_FRESHNESS_MS;
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

  private publish(at: number): void {
    const evidence = this.reconcile(Math.max(at, this.now()));
    this.listeners.forEach((listener) => listener(evidence));
  }
}
