import {
  TimelinePlayer,
  type FixtureManifest,
  type TimelinePlayback,
  type TimelineRow,
} from "../timeline";
import type {
  AnchoredHealthSamples,
  HealthAuthorizationStatus,
  HealthChange,
  HealthProvider,
  HealthSample,
  HealthSignal,
  HealthUnsubscribe,
} from "./HealthProvider";

export const HEALTH_SIGNALS = [
  "steps",
  "activeEnergy",
  "appleExerciseTime",
  "walkingRunningDistance",
  "cyclingDistance",
  "swimmingDistance",
  "workout",
] as const satisfies readonly HealthSignal[];

export const HEALTH_FIXTURE_EVENTS = [
  "health.samplesAdded",
  "health.backgroundWake",
  "health.authChanged",
] as const;

export type HealthFixtureEvent = (typeof HEALTH_FIXTURE_EVENTS)[number];

export interface HealthSamplesAddedPayload {
  readonly signal: HealthSignal;
  readonly samples: readonly HealthSample[];
}

export interface HealthBackgroundWakePayload {
  readonly signal: HealthSignal;
}

export interface HealthAuthChangedPayload {
  readonly status: HealthAuthorizationStatus;
}

export type HealthFixturePayload =
  | HealthSamplesAddedPayload
  | HealthBackgroundWakePayload
  | HealthAuthChangedPayload;

export type HealthTimelineRow =
  | TimelineRow<"health.samplesAdded", HealthSamplesAddedPayload>
  | TimelineRow<"health.backgroundWake", HealthBackgroundWakePayload>
  | TimelineRow<"health.authChanged", HealthAuthChangedPayload>;

export interface HealthFixtureManifest
  extends Omit<
    FixtureManifest<HealthFixtureEvent, HealthFixturePayload>,
    "timeline"
  > {
  readonly timeline: readonly HealthTimelineRow[];
}

interface StoredSample {
  readonly sequence: number;
  readonly sample: HealthSample;
}

function isHealthSignal(value: unknown): value is HealthSignal {
  return HEALTH_SIGNALS.includes(value as HealthSignal);
}

function assertSamplesPayload(
  payload: HealthFixturePayload,
): asserts payload is HealthSamplesAddedPayload {
  const candidate = payload as Partial<HealthSamplesAddedPayload>;
  if (!isHealthSignal(candidate.signal) || !Array.isArray(candidate.samples)) {
    throw new Error("Invalid payload for health.samplesAdded");
  }
  candidate.samples.forEach((sample) => {
    if (
      typeof sample.value !== "number" ||
      !Number.isFinite(sample.value) ||
      typeof sample.startISO !== "string" ||
      typeof sample.endISO !== "string" ||
      typeof sample.wasUserEntered !== "boolean"
    ) {
      throw new Error("Invalid sample in health.samplesAdded");
    }
  });
}

function assertSignalPayload(
  payload: HealthFixturePayload,
  event: "health.backgroundWake",
): asserts payload is HealthBackgroundWakePayload {
  if (!isHealthSignal((payload as Partial<HealthBackgroundWakePayload>).signal)) {
    throw new Error(`Invalid payload for ${event}`);
  }
}

function assertAuthPayload(
  payload: HealthFixturePayload,
): asserts payload is HealthAuthChangedPayload {
  const status = (payload as Partial<HealthAuthChangedPayload>).status;
  if (
    !["notDetermined", "restricted", "denied", "authorized"].includes(
      status ?? "",
    )
  ) {
    throw new Error("Invalid payload for health.authChanged");
  }
}

export class FixtureHealthProvider implements HealthProvider {
  private readonly authorizationCallbacks = new Set<
    (status: HealthAuthorizationStatus) => void
  >();
  private readonly changeCallbacks = new Map<
    HealthSignal,
    Set<(change: HealthChange) => void>
  >();
  private readonly player: TimelinePlayer<
    HealthFixtureEvent,
    HealthFixturePayload
  >;
  private readonly samples = new Map<HealthSignal, StoredSample[]>();
  private authorizationStatus: HealthAuthorizationStatus = "authorized";

  public constructor(
    public readonly fixture: HealthFixtureManifest,
    playback: TimelinePlayback = { mode: "manual" },
  ) {
    this.player = new TimelinePlayer<
      HealthFixtureEvent,
      HealthFixturePayload
    >({
      manifest: fixture,
      allowedEvents: HEALTH_FIXTURE_EVENTS,
      playback,
      onEvent: (row) => this.apply(row),
    });
  }

  public get currentTimeMs(): number {
    return this.player.currentTimeMs;
  }

  public async requestAuth(): Promise<HealthAuthorizationStatus> {
    return this.authorizationStatus;
  }

  public getAuthorizationStatus(): HealthAuthorizationStatus {
    return this.authorizationStatus;
  }

  public async getNewSamples(
    signal: HealthSignal,
    sinceAnchor: string | null,
  ): Promise<AnchoredHealthSamples> {
    const stored = this.samples.get(signal) ?? [];
    const sequence = this.parseAnchor(signal, sinceAnchor);
    return {
      samples: stored
        .filter((record) => record.sequence > sequence)
        .map((record) => record.sample),
      anchor: this.anchor(signal, stored.length),
    };
  }

  public async getTodayTotal(signal: HealthSignal): Promise<number> {
    return (this.samples.get(signal) ?? []).reduce(
      (total, record) =>
        record.sample.wasUserEntered ? total : total + record.sample.value,
      0,
    );
  }

  public onChange(
    signal: HealthSignal,
    callback: (change: HealthChange) => void,
  ): HealthUnsubscribe {
    const callbacks =
      this.changeCallbacks.get(signal) ??
      new Set<(change: HealthChange) => void>();
    callbacks.add(callback);
    this.changeCallbacks.set(signal, callbacks);
    return () => callbacks.delete(callback);
  }

  public onAuthorizationChange(
    callback: (status: HealthAuthorizationStatus) => void,
  ): HealthUnsubscribe {
    this.authorizationCallbacks.add(callback);
    return () => this.authorizationCallbacks.delete(callback);
  }

  public advanceBy(milliseconds: number): void {
    this.player.advanceBy(milliseconds);
  }

  public advanceTo(atMs: number): void {
    this.player.advanceTo(atMs);
  }

  public dispose(): void {
    this.authorizationCallbacks.clear();
    this.changeCallbacks.clear();
    this.player.dispose();
  }

  private apply(
    row: TimelineRow<HealthFixtureEvent, HealthFixturePayload>,
  ): void {
    if (row.event === "health.samplesAdded") {
      assertSamplesPayload(row.payload);
      const existing = this.samples.get(row.payload.signal) ?? [];
      const startSequence = existing.length;
      existing.push(
        ...row.payload.samples.map((sample, index) => ({
          sequence: startSequence + index + 1,
          sample,
        })),
      );
      this.samples.set(row.payload.signal, existing);
      this.emitChange({
        signal: row.payload.signal,
        reason: "samplesAdded",
        samples: row.payload.samples,
      });
      return;
    }

    if (row.event === "health.backgroundWake") {
      assertSignalPayload(row.payload, row.event);
      this.emitChange({
        signal: row.payload.signal,
        reason: "backgroundWake",
        samples: [],
      });
      return;
    }

    assertAuthPayload(row.payload);
    this.authorizationStatus = row.payload.status;
    this.authorizationCallbacks.forEach((callback) =>
      callback(this.authorizationStatus),
    );
  }

  private emitChange(change: HealthChange): void {
    this.changeCallbacks
      .get(change.signal)
      ?.forEach((callback) => callback(change));
  }

  private anchor(signal: HealthSignal, sequence: number): string {
    return `${this.fixture.name}:${signal}:${sequence}`;
  }

  private parseAnchor(signal: HealthSignal, anchor: string | null): number {
    if (anchor === null) {
      return 0;
    }
    const prefix = `${this.fixture.name}:${signal}:`;
    const sequence = Number(anchor.slice(prefix.length));
    if (
      !anchor.startsWith(prefix) ||
      !Number.isInteger(sequence) ||
      sequence < 0
    ) {
      throw new Error(`Invalid fixture Health anchor "${anchor}"`);
    }
    return sequence;
  }
}
