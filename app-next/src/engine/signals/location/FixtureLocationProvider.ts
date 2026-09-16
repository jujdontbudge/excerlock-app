import { TimelinePlayer, type TimelinePlayback, type TimelineRow } from "../timeline";
import type {
  GeofenceRegion,
  LocationAuthorizationStatus,
  LocationProvider,
  LocationSample,
  LocationUnsubscribe,
  RegionTransition,
} from "./LocationProvider";
import {
  LOCATION_FIXTURE_EVENTS,
  assertLocationAuthPayload,
  assertLocationRegionPayload,
  assertLocationUpdatePayload,
  validateLocationFixtureRow,
  type LocationFixtureEvent,
  type LocationFixtureManifest,
  type LocationFixturePayload,
} from "./fixtureManifest";
import { PRESENCE_CONFIRMATION_MS } from "./GeofenceEventProcessor";
import { assertGymRegionsAllowed } from "./gymRegions";
import type { GymSetupLocator, ManualGymCheckIn } from "./ManualGymCheckIn";
import { isSampleInsideRegion } from "./regionPresence";

export class FixtureLocationProvider implements LocationProvider, ManualGymCheckIn, GymSetupLocator {
  private readonly authorizationCallbacks =
    new Set<(status: LocationAuthorizationStatus) => void>();
  private readonly locationCallbacks =
    new Set<(sample: LocationSample) => void>();
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
      validateRow: validateLocationFixtureRow,
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

  public async refreshAuthorization(): Promise<LocationAuthorizationStatus> {
    return this.authorizationStatus;
  }

  public async startMonitoringRegions(regions: readonly GeofenceRegion[]): Promise<void> {
    regions.forEach((region) => this.monitoredRegions.set(region.id, region));
  }

  public async stopMonitoringRegions(regionIds?: readonly string[]): Promise<void> {
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

  public async locateForGymSetup(): Promise<LocationSample> {
    const authorization = await this.requestAuthorization();
    if (
      authorization !== "authorizedWhenInUse" &&
      authorization !== "authorizedAlways"
    ) {
      throw new Error("Location authorization is required to save a gym");
    }
    if (this.lastLocation === null) {
      throw new Error("No location fix is available yet");
    }
    return this.lastLocation;
  }

  public async checkIn(region: GeofenceRegion): Promise<boolean> {
    assertGymRegionsAllowed([region]);
    const authorization = await this.requestAuthorization();
    if (
      authorization !== "authorizedWhenInUse" &&
      authorization !== "authorizedAlways"
    ) {
      throw new Error("Location authorization is required for manual check-in");
    }
    if (this.lastLocation === null) {
      return false;
    }

    const inside = isSampleInsideRegion(this.lastLocation, region);
    this.presence.set(region.id, inside);
    if (!inside) {
      return false;
    }
    await new Promise<void>((resolve) => {
      setTimeout(resolve, PRESENCE_CONFIRMATION_MS);
    });
    if (this.presence.get(region.id) !== true) {
      return false;
    }
    const transition: RegionTransition = {
      type: "enter",
      regionId: region.id,
      atMs: this.lastLocation.atMs,
    };
    this.regionCallbacks.forEach((callback) => callback(transition));
    return true;
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

  private apply(row: TimelineRow<LocationFixtureEvent, LocationFixturePayload>): void {
    if (
      row.event === "location.enterRegion" ||
      row.event === "location.exitRegion"
    ) {
      assertLocationRegionPayload(row.payload, row.event);
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
      assertLocationUpdatePayload(row.payload);
      this.lastLocation = { ...row.payload, atMs: row.atMs };
      this.locationCallbacks.forEach((callback) =>
        callback(this.lastLocation as LocationSample),
      );
      return;
    }

    assertLocationAuthPayload(row.payload);
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
