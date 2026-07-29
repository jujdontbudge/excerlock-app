import {
  TimelinePlayer,
  type FixtureManifest,
  type TimelinePlayback,
  type TimelineRow,
} from "../timeline";
import type {
  ScreenTimeAuthorizationStatus,
  ScreenTimeEvent,
  ScreenTimeProvider,
  ScreenTimeUnsubscribe,
} from "./ScreenTimeProvider";

export const SCREENTIME_FIXTURE_EVENTS = [
  "screentime.tick",
  "screentime.monitorFired",
  "screentime.intervalEnded",
  "screentime.authChanged",
] as const;

export type ScreenTimeFixtureEvent =
  (typeof SCREENTIME_FIXTURE_EVENTS)[number];

export interface ScreenTimeTickPayload {
  readonly thresholdIndex: number;
}

export interface ScreenTimeMonitorPayload {
  readonly monitor: string;
}

export interface ScreenTimeAuthChangedPayload {
  readonly status: ScreenTimeAuthorizationStatus;
}

export type ScreenTimeFixturePayload =
  | ScreenTimeTickPayload
  | ScreenTimeMonitorPayload
  | ScreenTimeAuthChangedPayload;

export type ScreenTimeTimelineRow =
  | TimelineRow<"screentime.tick", ScreenTimeTickPayload>
  | TimelineRow<"screentime.monitorFired", ScreenTimeMonitorPayload>
  | TimelineRow<"screentime.intervalEnded", ScreenTimeMonitorPayload>
  | TimelineRow<"screentime.authChanged", ScreenTimeAuthChangedPayload>;

export interface ScreenTimeFixtureManifest
  extends Omit<
    FixtureManifest<ScreenTimeFixtureEvent, ScreenTimeFixturePayload>,
    "timeline"
  > {
  readonly timeline: readonly ScreenTimeTimelineRow[];
}

function assertTickPayload(
  payload: ScreenTimeFixturePayload,
): asserts payload is ScreenTimeTickPayload {
  const thresholdIndex = (payload as Partial<ScreenTimeTickPayload>)
    .thresholdIndex;
  if (
    !Number.isInteger(thresholdIndex) ||
    thresholdIndex === undefined ||
    thresholdIndex < 0
  ) {
    throw new Error("Invalid payload for screentime.tick");
  }
}

function assertMonitorPayload(
  payload: ScreenTimeFixturePayload,
  event: "screentime.monitorFired" | "screentime.intervalEnded",
): asserts payload is ScreenTimeMonitorPayload {
  if (typeof (payload as Partial<ScreenTimeMonitorPayload>).monitor !== "string") {
    throw new Error(`Invalid payload for ${event}`);
  }
}

function assertAuthPayload(
  payload: ScreenTimeFixturePayload,
): asserts payload is ScreenTimeAuthChangedPayload {
  const status = (payload as Partial<ScreenTimeAuthChangedPayload>).status;
  if (!["notDetermined", "denied", "approved"].includes(status ?? "")) {
    throw new Error("Invalid payload for screentime.authChanged");
  }
}

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
      assertAuthPayload(row.payload);
      this.authorizationStatus = row.payload.status;
      this.authorizationCallbacks.forEach((callback) =>
        callback(this.authorizationStatus),
      );
      return;
    }

    let event: ScreenTimeEvent;
    if (row.event === "screentime.tick") {
      assertTickPayload(row.payload);
      event = {
        type: "tick",
        atMs: row.atMs,
        thresholdIndex: row.payload.thresholdIndex,
      };
    } else {
      assertMonitorPayload(row.payload, row.event);
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
