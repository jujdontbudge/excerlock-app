import {
  TimelinePlayer,
  type FixtureManifest,
  type TimelinePlayback,
  type TimelineRow,
} from "../timeline";
import type {
  ActivityClass,
  ActivitySample,
  CadenceSample,
  MotionAuthStatus,
  MotionAvailability,
  MotionConfidence,
  MotionProvider,
  Unsubscribe,
} from "./MotionProvider";

export const MOTION_FIXTURE_EVENTS = [
  "motion.activityChange",
  "motion.pedometerUpdate",
  "motion.authDenied",
] as const;

export type MotionFixtureEvent = (typeof MOTION_FIXTURE_EVENTS)[number];

export interface MotionActivityChangePayload {
  readonly activity: "walking" | "stationary" | "automotive";
  readonly confidence: MotionConfidence;
}

export interface MotionPedometerUpdatePayload {
  readonly steps: number;
  readonly cadence: number | null;
}

export type MotionFixturePayload =
  | MotionActivityChangePayload
  | MotionPedometerUpdatePayload
  | Record<string, never>;

export type MotionTimelineRow =
  | TimelineRow<"motion.activityChange", MotionActivityChangePayload>
  | TimelineRow<"motion.pedometerUpdate", MotionPedometerUpdatePayload>
  | TimelineRow<"motion.authDenied", Record<string, never>>;

export interface MotionFixtureManifest
  extends Omit<
    FixtureManifest<MotionFixtureEvent, MotionFixturePayload>,
    "timeline"
  > {
  readonly timeline: readonly MotionTimelineRow[];
}

export class MotionFixtureError extends Error {
  public constructor(
    public readonly code:
      | "ERR_MOTION_DENIED"
      | "ERR_MOTION_RESTRICTED"
      | "ERR_MOTION_UNAVAILABLE",
  ) {
    super(code);
    this.name = "MotionFixtureError";
  }
}

const FIXTURE_AVAILABILITY: MotionAvailability = {
  activity: true,
  cadence: true,
  stepCounting: true,
};

function isFiniteNonNegative(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

function assertActivityPayload(
  payload: MotionFixturePayload,
): asserts payload is MotionActivityChangePayload {
  const candidate = payload as Partial<MotionActivityChangePayload>;
  if (
    !["walking", "stationary", "automotive"].includes(
      candidate.activity ?? "",
    ) ||
    !["low", "medium", "high"].includes(candidate.confidence ?? "")
  ) {
    throw new Error("Invalid payload for motion.activityChange");
  }
}

function assertPedometerPayload(
  payload: MotionFixturePayload,
): asserts payload is MotionPedometerUpdatePayload {
  const candidate = payload as Partial<MotionPedometerUpdatePayload>;
  if (
    !isFiniteNonNegative(candidate.steps) ||
    (candidate.cadence !== null && !isFiniteNonNegative(candidate.cadence))
  ) {
    throw new Error("Invalid payload for motion.pedometerUpdate");
  }
}

export class FixtureMotionProvider implements MotionProvider {
  private readonly activityCallbacks = new Set<
    (sample: ActivitySample) => void
  >();
  private readonly activitySamples: ActivitySample[] = [];
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
      assertActivityPayload(row.payload);
      const sample: ActivitySample = {
        classes: [row.payload.activity as ActivityClass],
        confidence: row.payload.confidence,
        startedAt: row.atMs,
        receivedAt: row.atMs,
      };
      this.activitySamples.push(sample);
      if (this.started) {
        this.activityCallbacks.forEach((callback) => callback(sample));
      }
      return;
    }

    assertPedometerPayload(row.payload);
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
