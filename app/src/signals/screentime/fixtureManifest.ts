import {
  assertExactPayloadKeys,
  type FixtureManifest,
  type TimelineRow,
} from "../timeline";
import type { ScreenTimeAuthorizationStatus } from "./ScreenTimeProvider";

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

export function assertScreenTimeTickPayload(
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

export function assertScreenTimeMonitorPayload(
  payload: ScreenTimeFixturePayload,
  event: "screentime.monitorFired" | "screentime.intervalEnded",
): asserts payload is ScreenTimeMonitorPayload {
  if (typeof (payload as Partial<ScreenTimeMonitorPayload>).monitor !== "string") {
    throw new Error(`Invalid payload for ${event}`);
  }
}

export function assertScreenTimeAuthPayload(
  payload: ScreenTimeFixturePayload,
): asserts payload is ScreenTimeAuthChangedPayload {
  const status = (payload as Partial<ScreenTimeAuthChangedPayload>).status;
  if (!["notDetermined", "denied", "approved"].includes(status ?? "")) {
    throw new Error("Invalid payload for screentime.authChanged");
  }
}

export function validateScreenTimeFixtureRow(
  row: TimelineRow<ScreenTimeFixtureEvent, ScreenTimeFixturePayload>,
): void {
  if (row.event === "screentime.tick") {
    assertExactPayloadKeys(row.payload, ["thresholdIndex"], row.event);
    assertScreenTimeTickPayload(row.payload);
  } else if (row.event === "screentime.authChanged") {
    assertExactPayloadKeys(row.payload, ["status"], row.event);
    assertScreenTimeAuthPayload(row.payload);
  } else {
    assertExactPayloadKeys(row.payload, ["monitor"], row.event);
    assertScreenTimeMonitorPayload(row.payload, row.event);
  }
}
