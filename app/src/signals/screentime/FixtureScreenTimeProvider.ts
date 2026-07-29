import {
  TimelinePlayer,
  type TimelinePlayback,
  type TimelineRow,
} from "../timeline";
import type {
  ScreenTimeAuthorizationStatus,
  ScreenTimeEvent,
  ScreenTimeProvider,
  ScreenTimeUnsubscribe,
} from "./ScreenTimeProvider";
import {
  SCREENTIME_FIXTURE_EVENTS,
  assertScreenTimeAuthPayload,
  assertScreenTimeMonitorPayload,
  assertScreenTimeTickPayload,
  validateScreenTimeFixtureRow,
  type ScreenTimeFixtureEvent,
  type ScreenTimeFixtureManifest,
  type ScreenTimeFixturePayload,
} from "./fixtureManifest";

export class FixtureScreenTimeProvider implements ScreenTimeProvider {
  private readonly authorizationCallbacks = new Set<
    (status: ScreenTimeAuthorizationStatus) => void
  >();
  private readonly eventCallbacks = new Set<(event: ScreenTimeEvent) => void>();
  private readonly events: ScreenTimeEvent[] = [];
  private readonly player: TimelinePlayer<
    ScreenTimeFixtureEvent,
    ScreenTimeFixturePayload
  >;
  private authorizationStatus: ScreenTimeAuthorizationStatus = "approved";

  public constructor(
    public readonly fixture: ScreenTimeFixtureManifest,
    playback: TimelinePlayback = { mode: "manual" },
  ) {
    this.player = new TimelinePlayer<
      ScreenTimeFixtureEvent,
      ScreenTimeFixturePayload
    >({
      manifest: fixture,
      allowedEvents: SCREENTIME_FIXTURE_EVENTS,
      playback,
      validateRow: validateScreenTimeFixtureRow,
      onEvent: (row) => this.apply(row),
    });
  }

  public get currentTimeMs(): number {
    return this.player.currentTimeMs;
  }

  public async requestAuthorization(): Promise<ScreenTimeAuthorizationStatus> {
    return this.authorizationStatus;
  }

  public getAuthorizationStatus(): ScreenTimeAuthorizationStatus {
    return this.authorizationStatus;
  }

  public async getEvents(
    sinceAtMs = Number.NEGATIVE_INFINITY,
  ): Promise<readonly ScreenTimeEvent[]> {
    return this.events.filter((event) => event.atMs >= sinceAtMs);
  }

  public onEvent(
    callback: (event: ScreenTimeEvent) => void,
  ): ScreenTimeUnsubscribe {
    this.eventCallbacks.add(callback);
    return () => this.eventCallbacks.delete(callback);
  }

  public onAuthorizationChange(
    callback: (status: ScreenTimeAuthorizationStatus) => void,
  ): ScreenTimeUnsubscribe {
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
    this.eventCallbacks.clear();
    this.player.dispose();
  }

  private apply(
    row: TimelineRow<ScreenTimeFixtureEvent, ScreenTimeFixturePayload>,
  ): void {
    if (row.event === "screentime.authChanged") {
      assertScreenTimeAuthPayload(row.payload);
      this.authorizationStatus = row.payload.status;
      this.authorizationCallbacks.forEach((callback) =>
        callback(this.authorizationStatus),
      );
      return;
    }

    let event: ScreenTimeEvent;
    if (row.event === "screentime.tick") {
      assertScreenTimeTickPayload(row.payload);
      event = {
        type: "tick",
        atMs: row.atMs,
        thresholdIndex: row.payload.thresholdIndex,
      };
    } else {
      assertScreenTimeMonitorPayload(row.payload, row.event);
      event = {
        type:
          row.event === "screentime.monitorFired"
            ? "monitorFired"
            : "intervalEnded",
        atMs: row.atMs,
        monitor: row.payload.monitor,
      };
    }

    this.events.push(event);
    this.eventCallbacks.forEach((callback) => callback(event));
  }
}
