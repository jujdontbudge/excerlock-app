import {
  TimelinePlayer,
  type TimelinePlayback,
  type TimelineRow,
} from "../timeline";
import type {
  ActivitySample,
  CadenceSample,
  MotionAuthStatus,
  MotionAvailability,
  MotionProvider,
  Unsubscribe,
} from "./MotionProvider";
import {
  MOTION_FIXTURE_EVENTS,
  assertMotionActivityPayload,
  assertMotionPedometerPayload,
  validateMotionFixtureRow,
  type MotionFixtureEvent,
  type MotionFixtureManifest,
  type MotionFixturePayload,
} from "./fixtureManifest";
import { MotionFixtureError } from "./MotionFixtureError";
import { activitySampleAt } from "./fixtureActivity";

const FIXTURE_AVAILABILITY: MotionAvailability = {
  activity: true,
  cadence: true,
  stepCounting: true,
};

export class FixtureMotionProvider implements MotionProvider {
  private readonly activityCallbacks = new Set<
    (sample: ActivitySample) => void
  >();
  private readonly activitySamples: ActivitySample[] = [];
  private readonly appliedActivityTimes = new Set<number>();
  private readonly cadenceCallbacks = new Set<(sample: CadenceSample) => void>();
  private readonly cadenceSamples: CadenceSample[] = [];
  private readonly player: TimelinePlayer<
    MotionFixtureEvent,
    MotionFixturePayload
  >;
  private authorizationStatus: MotionAuthStatus = "authorized";
  private started = false;

  public constructor(
    public readonly fixture: MotionFixtureManifest,
    playback: TimelinePlayback = { mode: "manual" },
  ) {
    this.player = new TimelinePlayer<
      MotionFixtureEvent,
      MotionFixturePayload
    >({
      manifest: fixture,
      allowedEvents: MOTION_FIXTURE_EVENTS,
      playback,
      validateRow: validateMotionFixtureRow,
      onEvent: (row) => this.apply(row),
    });
  }

  public get currentTimeMs(): number {
    return this.player.currentTimeMs;
  }

  public getAvailability(): MotionAvailability {
    return FIXTURE_AVAILABILITY;
  }

  public getAuthorizationStatus(): MotionAuthStatus {
    return this.authorizationStatus;
  }

  public async requestAuthorization(): Promise<MotionAuthStatus> {
    return this.authorizationStatus;
  }

  public async start(): Promise<void> {
    if (this.authorizationStatus === "denied") {
      throw new MotionFixtureError("ERR_MOTION_DENIED");
    }
    if (this.authorizationStatus === "restricted") {
      throw new MotionFixtureError("ERR_MOTION_RESTRICTED");
    }
    this.started = true;
  }

  public async stop(): Promise<void> {
    this.started = false;
  }

  public async queryActivity(
    fromMs: number,
    toMs: number,
  ): Promise<readonly ActivitySample[]> {
    return this.activitySamples.filter(
      (sample) => sample.startedAt >= fromMs && sample.startedAt <= toMs,
    );
  }

  public async querySteps(
    fromMs: number,
    toMs: number,
  ): Promise<{ readonly steps: number }> {
    const baseline =
      [...this.cadenceSamples]
        .reverse()
        .find((sample) => sample.asOf <= fromMs)?.cumulativeSteps ?? 0;
    const last =
      [...this.cadenceSamples]
        .reverse()
        .find((sample) => sample.asOf <= toMs)?.cumulativeSteps ?? baseline;
    return { steps: Math.max(0, last - baseline) };
  }

  public on(
    event: "activity",
    callback: (sample: ActivitySample) => void,
  ): Unsubscribe;
  public on(
    event: "cadence",
    callback: (sample: CadenceSample) => void,
  ): Unsubscribe;
  public on(
    event: "activity" | "cadence",
    callback: ((sample: ActivitySample) => void) | ((sample: CadenceSample) => void),
  ): Unsubscribe {
    if (event === "activity") {
      const activityCallback = callback as (sample: ActivitySample) => void;
      this.activityCallbacks.add(activityCallback);
      return () => this.activityCallbacks.delete(activityCallback);
    }

    const cadenceCallback = callback as (sample: CadenceSample) => void;
    this.cadenceCallbacks.add(cadenceCallback);
    return () => this.cadenceCallbacks.delete(cadenceCallback);
  }

  public advanceBy(milliseconds: number): void {
    this.player.advanceBy(milliseconds);
  }

  public advanceTo(atMs: number): void {
    this.player.advanceTo(atMs);
  }

  public dispose(): void {
    this.started = false;
    this.activityCallbacks.clear();
    this.cadenceCallbacks.clear();
    this.player.dispose();
  }

  private apply(
    row: TimelineRow<MotionFixtureEvent, MotionFixturePayload>,
  ): void {
    if (row.event === "motion.authDenied") {
      this.authorizationStatus = "denied";
      this.started = false;
      return;
    }

    if (row.event === "motion.activityChange") {
      if (this.appliedActivityTimes.has(row.atMs)) {
        return;
      }
      assertMotionActivityPayload(row.payload);
      this.appliedActivityTimes.add(row.atMs);
      const sample = activitySampleAt(this.fixture, row.atMs);
      this.activitySamples.push(sample);
      if (this.started) {
        this.activityCallbacks.forEach((callback) => callback(sample));
      }
      return;
    }

    assertMotionPedometerPayload(row.payload);
    const sample: CadenceSample = {
      stepsPerSecond: row.payload.cadence,
      cumulativeSteps: row.payload.steps,
      asOf: row.atMs,
    };
    this.cadenceSamples.push(sample);
    if (this.started) {
      this.cadenceCallbacks.forEach((callback) => callback(sample));
    }
  }
}
