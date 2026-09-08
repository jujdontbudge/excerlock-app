import {
  assertExactPayloadKeys,
  type FixtureManifest,
  type TimelineRow,
} from "../timeline";
import type { LocationAuthorizationStatus } from "./LocationProvider";

export const LOCATION_FIXTURE_EVENTS = [
  "location.enterRegion",
  "location.exitRegion",
  "location.update",
  "location.authChanged",
] as const;

export type LocationFixtureEvent = (typeof LOCATION_FIXTURE_EVENTS)[number];

export interface LocationRegionPayload {
  readonly regionId: string;
}

export interface LocationUpdatePayload {
  readonly lat: number;
  readonly lon: number;
  readonly accuracy: number;
}

export interface LocationAuthChangedPayload {
  readonly status: LocationAuthorizationStatus;
}

export type LocationFixturePayload =
  | LocationRegionPayload
  | LocationUpdatePayload
  | LocationAuthChangedPayload;

export type LocationTimelineRow =
  | TimelineRow<"location.enterRegion", LocationRegionPayload>
  | TimelineRow<"location.exitRegion", LocationRegionPayload>
  | TimelineRow<"location.update", LocationUpdatePayload>
  | TimelineRow<"location.authChanged", LocationAuthChangedPayload>;

export interface LocationFixtureManifest
  extends Omit<
    FixtureManifest<LocationFixtureEvent, LocationFixturePayload>,
    "timeline"
  > {
  readonly timeline: readonly LocationTimelineRow[];
}

export function assertLocationRegionPayload(
  payload: LocationFixturePayload,
  event: "location.enterRegion" | "location.exitRegion",
): asserts payload is LocationRegionPayload {
  if (
    typeof (payload as Partial<LocationRegionPayload>).regionId !== "string"
  ) {
    throw new Error(`Invalid payload for ${event}`);
  }
}

export function assertLocationUpdatePayload(
  payload: LocationFixturePayload,
): asserts payload is LocationUpdatePayload {
  const candidate = payload as Partial<LocationUpdatePayload>;
  if (
    typeof candidate.lat !== "number" ||
    !Number.isFinite(candidate.lat) ||
    candidate.lat < -90 ||
    candidate.lat > 90 ||
    typeof candidate.lon !== "number" ||
    !Number.isFinite(candidate.lon) ||
    candidate.lon < -180 ||
    candidate.lon > 180 ||
    typeof candidate.accuracy !== "number" ||
    !Number.isFinite(candidate.accuracy) ||
    candidate.accuracy < 0
  ) {
    throw new Error("Invalid payload for location.update");
  }
}

export function assertLocationAuthPayload(
  payload: LocationFixturePayload,
): asserts payload is LocationAuthChangedPayload {
  const status = (payload as Partial<LocationAuthChangedPayload>).status;
  if (
    ![
      "notDetermined",
      "restricted",
      "denied",
      "authorizedWhenInUse",
      "authorizedAlways",
    ].includes(status ?? "")
  ) {
    throw new Error("Invalid payload for location.authChanged");
  }
}

export function validateLocationFixtureRow(
  row: TimelineRow<LocationFixtureEvent, LocationFixturePayload>,
): void {
  if (
    row.event === "location.enterRegion" ||
    row.event === "location.exitRegion"
  ) {
    assertExactPayloadKeys(row.payload, ["regionId"], row.event);
    assertLocationRegionPayload(row.payload, row.event);
  } else if (row.event === "location.update") {
    assertExactPayloadKeys(
      row.payload,
      ["lat", "lon", "accuracy"],
      row.event,
    );
    assertLocationUpdatePayload(row.payload);
  } else {
    assertExactPayloadKeys(row.payload, ["status"], row.event);
    assertLocationAuthPayload(row.payload);
  }
}
