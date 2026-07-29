import {
  TimelinePlayer,
  type FixtureManifest,
  type TimelinePlayback,
  type TimelineRow,
} from "../timeline";
import type {
  GeofenceRegion,
  LocationAuthorizationStatus,
  LocationProvider,
  LocationSample,
  LocationUnsubscribe,
  RegionTransition,
} from "./LocationProvider";

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

function assertRegionPayload(
  payload: LocationFixturePayload,
  event: "location.enterRegion" | "location.exitRegion",
): asserts payload is LocationRegionPayload {
  if (
    typeof (payload as Partial<LocationRegionPayload>).regionId !== "string"
  ) {
    throw new Error(`Invalid payload for ${event}`);
  }
}

function assertUpdatePayload(
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

function assertAuthPayload(
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

export class FixtureLocationProvider implements LocationProvider {
  private readonly authorizationCallbacks = new Set<
    (status: LocationAuthorizationStatus) => void
  >();
  private readonly locationCallbacks = new Set<
    (sample: LocationSample) => void
  >();
  private readonly monitoredRegions = new Map<string, GeofenceRegion>();
  private readonly player: TimelinePlayer<
    LocationFixtureEvent,
    LocationFixturePayload
  >;
  private readonly presence = new Map<string, boolean>();
  private readonly regionCallbacks = new Set<
    (transition: RegionTransition) => void
  >();
  private authorizationStatus: LocationAuthorizationStatus =
    "authorizedWhenInUse";
  private lastLocation: LocationSample | null = null;
  private walkKeepAliveActive = false;

  public constructor(
    public readonly fixture: LocationFixtureManifest,
    playback: TimelinePlayback = { mode: "manual" },
  ) {
    this.player = new TimelinePlayer<
      LocationFixtureEvent,
      LocationFixturePayload
    >({
      manifest: fixture,
      allowedEvents: LOCATION_FIXTURE_EVENTS,
      playback,
      onEvent: (row) => this.apply(row),
    });
  }

  public get currentTimeMs(): number {
    return this.player.currentTimeMs;
  }

  public async requestAuthorization(): Promise<LocationAuthorizationStatus> {
    return this.authorizationStatus;
  }

  public getAuthorizationStatus(): LocationAuthorizationStatus {
    return this.authorizationStatus;
  }

  public async startMonitoringRegions(
    regions: readonly GeofenceRegion[],
  ): Promise<void> {
    regions.forEach((region) => this.monitoredRegions.set(region.id, region));
  }

  public async stopMonitoringRegions(
    regionIds?: readonly string[],
  ): Promise<void> {
    if (regionIds === undefined) {
      this.monitoredRegions.clear();
      return;
    }
    regionIds.forEach((regionId) => this.monitoredRegions.delete(regionId));
  }

  public isInsideRegion(regionId: string): boolean | null {
    return this.presence.get(regionId) ?? null;
  }

  public getLastLocation(): LocationSample | null {
    return this.lastLocation;
  }

  public async startWalkKeepAlive(): Promise<void> {
    if (
      this.authorizationStatus !== "authorizedWhenInUse" &&
      this.authorizationStatus !== "authorizedAlways"
    ) {
      throw new Error("Location authorization is required for walk keep-alive");
    }
    this.walkKeepAliveActive = true;
  }

  public async stopWalkKeepAlive(): Promise<void> {
    this.walkKeepAliveActive = false;
  }

  public isWalkKeepAliveActive(): boolean {
    return this.walkKeepAliveActive;
  }

  public on(
    event: "region",
    callback: (transition: RegionTransition) => void,
  ): LocationUnsubscribe;
  public on(
    event: "location",
    callback: (sample: LocationSample) => void,
  ): LocationUnsubscribe;
  public on(
    event: "authorization",
    callback: (status: LocationAuthorizationStatus) => void,
  ): LocationUnsubscribe;
  public on(
    event: "region" | "location" | "authorization",
    callback:
      | ((transition: RegionTransition) => void)
      | ((sample: LocationSample) => void)
      | ((status: LocationAuthorizationStatus) => void),
  ): LocationUnsubscribe {
    if (event === "region") {
      const regionCallback = callback as (transition: RegionTransition) => void;
      this.regionCallbacks.add(regionCallback);
      return () => this.regionCallbacks.delete(regionCallback);
    }
    if (event === "location") {
      const locationCallback = callback as (sample: LocationSample) => void;
      this.locationCallbacks.add(locationCallback);
      return () => this.locationCallbacks.delete(locationCallback);
    }
    const authorizationCallback = callback as (
      status: LocationAuthorizationStatus,
    ) => void;
    this.authorizationCallbacks.add(authorizationCallback);
    return () => this.authorizationCallbacks.delete(authorizationCallback);
  }

  public advanceBy(milliseconds: number): void {
    this.player.advanceBy(milliseconds);
  }

  public advanceTo(atMs: number): void {
    this.player.advanceTo(atMs);
  }

  public dispose(): void {
    this.walkKeepAliveActive = false;
    this.authorizationCallbacks.clear();
    this.locationCallbacks.clear();
    this.regionCallbacks.clear();
    this.player.dispose();
  }

  private apply(
    row: TimelineRow<LocationFixtureEvent, LocationFixturePayload>,
  ): void {
    if (
      row.event === "location.enterRegion" ||
      row.event === "location.exitRegion"
    ) {
      assertRegionPayload(row.payload, row.event);
      const type = row.event === "location.enterRegion" ? "enter" : "exit";
      this.presence.set(row.payload.regionId, type === "enter");
      if (this.monitoredRegions.has(row.payload.regionId)) {
        const transition: RegionTransition = {
          type,
          regionId: row.payload.regionId,
          atMs: row.atMs,
        };
        this.regionCallbacks.forEach((callback) => callback(transition));
      }
      return;
    }

    if (row.event === "location.update") {
      assertUpdatePayload(row.payload);
      this.lastLocation = { ...row.payload, atMs: row.atMs };
      this.locationCallbacks.forEach((callback) =>
        callback(this.lastLocation as LocationSample),
      );
      return;
    }

    assertAuthPayload(row.payload);
    this.authorizationStatus = row.payload.status;
    if (
      this.authorizationStatus !== "authorizedWhenInUse" &&
      this.authorizationStatus !== "authorizedAlways"
    ) {
      this.walkKeepAliveActive = false;
    }
    this.authorizationCallbacks.forEach((callback) =>
      callback(this.authorizationStatus),
    );
  }
}
