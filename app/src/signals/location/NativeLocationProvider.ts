import type { NativeLocationClient } from "./NativeLocationClient";
import { assertGymRegionsAllowed } from "./gymRegions";
import { isSampleInsideRegion } from "./regionPresence";
import type {
  GeofenceRegion,
  LocationAuthorizationStatus,
  LocationProvider,
  LocationSample,
  LocationUnsubscribe,
  RegionTransition,
} from "./LocationProvider";

export class NativeLocationProvider implements LocationProvider {
  private readonly authorizationCallbacks =
    new Set<(status: LocationAuthorizationStatus) => void>();
  private readonly locationCallbacks =
    new Set<(sample: LocationSample) => void>();
  private readonly monitoredRegions = new Map<string, GeofenceRegion>();
  private readonly presence = new Map<string, boolean>();
  private readonly regionCallbacks =
    new Set<(transition: RegionTransition) => void>();
  private readonly unsubscribeClient: readonly LocationUnsubscribe[];
  private authorizationStatus: LocationAuthorizationStatus;
  private lastLocation: LocationSample | null;

  public constructor(private readonly client: NativeLocationClient) {
    this.authorizationStatus = client.getAuthorizationStatus();
    this.lastLocation = client.getLastLocation();
    this.unsubscribeClient = [
      client.onRegionPresence((transition) => {
        this.presence.set(transition.regionId, transition.type === "enter");
      }),
      client.onRegionTransition((transition) => {
        if (this.monitoredRegions.has(transition.regionId)) {
          this.regionCallbacks.forEach((callback) => callback(transition));
        }
      }),
      client.onLocation((sample) => {
        this.lastLocation = sample;
        this.locationCallbacks.forEach((callback) => callback(sample));
      }),
    ];
  }

  public async requestAuthorization(): Promise<LocationAuthorizationStatus> {
    return this.updateAuthorization(
      await this.client.requestForegroundAuthorization(),
    );
  }

  public getAuthorizationStatus(): LocationAuthorizationStatus {
    return this.authorizationStatus;
  }

  public async startMonitoringRegions(
    regions: readonly GeofenceRegion[],
  ): Promise<void> {
    assertGymRegionsAllowed(regions);
    const foregroundAuthorization =
      this.authorizationStatus === "authorizedWhenInUse" ||
      this.authorizationStatus === "authorizedAlways"
        ? this.authorizationStatus
        : await this.requestAuthorization();
    if (
      foregroundAuthorization !== "authorizedWhenInUse" &&
      foregroundAuthorization !== "authorizedAlways"
    ) {
      throw new Error("Location authorization is required for auto-detect");
    }
    const authorization =
      foregroundAuthorization === "authorizedAlways"
        ? foregroundAuthorization
        : await this.client.requestBackgroundAuthorization();
    this.updateAuthorization(authorization);
    if (authorization !== "authorizedAlways") {
      throw new Error("Always location authorization is required for auto-detect");
    }

    await this.client.startGeofencing(regions);
    this.monitoredRegions.clear();
    regions.forEach((region) => {
      this.monitoredRegions.set(region.id, region);
      const cachedPresence = this.client.getCachedRegionPresence(region.id);
      if (cachedPresence !== null) {
        this.presence.set(region.id, cachedPresence);
      }
    });
  }

  public async stopMonitoringRegions(
    regionIds?: readonly string[],
  ): Promise<void> {
    if (regionIds === undefined) {
      await this.client.stopGeofencing();
      this.monitoredRegions.clear();
      this.presence.clear();
      return;
    }

    regionIds.forEach((regionId) => {
      this.monitoredRegions.delete(regionId);
      this.presence.delete(regionId);
    });
    const remainingRegions = [...this.monitoredRegions.values()];
    if (remainingRegions.length === 0) {
      await this.client.stopGeofencing();
    } else {
      await this.client.startGeofencing(remainingRegions);
    }
  }

  public isInsideRegion(regionId: string): boolean | null {
    return this.presence.get(regionId) ?? null;
  }

  public getLastLocation(): LocationSample | null {
    return this.lastLocation;
  }

  /** Foreground-only manual check-in; this never requests background access. */
  public async checkIn(region: GeofenceRegion): Promise<boolean> {
    assertGymRegionsAllowed([region]);
    const authorization = await this.requestAuthorization();
    if (
      authorization !== "authorizedWhenInUse" &&
      authorization !== "authorizedAlways"
    ) {
      throw new Error("Location authorization is required for manual check-in");
    }

    const sample = await this.client.getCurrentLocation();
    this.lastLocation = sample;
    this.locationCallbacks.forEach((callback) => callback(sample));
    const inside = isSampleInsideRegion(sample, region);
    this.presence.set(region.id, inside);
    if (inside) {
      const transition: RegionTransition = {
        type: "enter",
        regionId: region.id,
        atMs: sample.atMs,
      };
      this.regionCallbacks.forEach((callback) => callback(transition));
    }
    return inside;
  }

  public async startWalkKeepAlive(): Promise<void> {
    const authorization =
      this.authorizationStatus === "authorizedWhenInUse" ||
      this.authorizationStatus === "authorizedAlways"
        ? this.authorizationStatus
        : await this.requestAuthorization();
    if (
      authorization !== "authorizedWhenInUse" &&
      authorization !== "authorizedAlways"
    ) {
      throw new Error("Location authorization is required for walk keep-alive");
    }
    await this.client.startLocationUpdates();
  }

  public async stopWalkKeepAlive(): Promise<void> {
    await this.client.stopLocationUpdates();
  }

  public isWalkKeepAliveActive(): boolean {
    return this.client.isLocationUpdatesActive();
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

  public dispose(): void {
    this.unsubscribeClient.forEach((unsubscribe) => unsubscribe());
    this.authorizationCallbacks.clear();
    this.locationCallbacks.clear();
    this.regionCallbacks.clear();
  }

  private updateAuthorization(
    status: LocationAuthorizationStatus,
  ): LocationAuthorizationStatus {
    if (status !== this.authorizationStatus) {
      this.authorizationStatus = status;
      this.authorizationCallbacks.forEach((callback) => callback(status));
    }
    return status;
  }
}
