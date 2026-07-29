import {
  TimelinePlayer,
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
import {
  HEALTH_FIXTURE_EVENTS,
  assertHealthAuthPayload,
  assertHealthSamplesPayload,
  assertHealthWakePayload,
  validateHealthFixtureRow,
  type HealthFixtureEvent,
  type HealthFixtureManifest,
  type HealthFixturePayload,
} from "./fixtureManifest";

interface StoredSample {
  readonly sequence: number;
  readonly sample: HealthSample;
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
      validateRow: validateHealthFixtureRow,
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
      assertHealthSamplesPayload(row.payload);
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
      assertHealthWakePayload(row.payload);
      this.emitChange({
        signal: row.payload.signal,
        reason: "backgroundWake",
        samples: [],
      });
      return;
    }

    assertHealthAuthPayload(row.payload);
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
