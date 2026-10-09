import type { NativeLocationClient } from "./NativeLocationClient";
import type { LocationTaskRuntime } from "./LocationTaskRuntime";
import type {
  GeofenceRegion,
  LocationAuthorizationStatus,
  LocationSample,
  LocationUnsubscribe,
  RegionTransition,
} from "./LocationProvider";
import {
  GEOFENCE_TASK_NAME,
  WALK_LOCATION_TASK_NAME,
} from "./locationTaskNames";

type ExpoPermissionResponse = {
  readonly status: "granted" | "denied" | "undetermined";
  readonly ios?: {
    readonly scope: "whenInUse" | "always" | "none";
  };
};

type ExpoLocationObject = {
  readonly coords: {
    readonly accuracy: number | null;
    readonly latitude: number;
    readonly longitude: number;
    readonly speed?: number | null;
    readonly heading?: number | null;
  };
  readonly timestamp: number;
};

const knownOrNull = (value: number | null | undefined): number | null =>
  typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : null;

export interface ExpoLocationModule {
  readonly Accuracy: { readonly High: unknown; readonly Balanced: unknown };
  readonly ActivityType: { readonly Other: unknown };
  getForegroundPermissionsAsync(): Promise<ExpoPermissionResponse>;
  getBackgroundPermissionsAsync(): Promise<ExpoPermissionResponse>;
  hasStartedLocationUpdatesAsync(taskName: string): Promise<boolean>;
  requestForegroundPermissionsAsync(): Promise<ExpoPermissionResponse>;
  requestBackgroundPermissionsAsync(): Promise<ExpoPermissionResponse>;
  getCurrentPositionAsync(options: {
    readonly accuracy: unknown;
  }): Promise<ExpoLocationObject>;
  startGeofencingAsync(
    taskName: string,
    regions: readonly {
      readonly identifier: string;
      readonly latitude: number;
      readonly longitude: number;
      readonly radius: number;
      readonly notifyOnEnter: boolean;
      readonly notifyOnExit: boolean;
    }[],
  ): Promise<void>;
  hasStartedGeofencingAsync(taskName: string): Promise<boolean>;
  stopGeofencingAsync(taskName: string): Promise<void>;
  startLocationUpdatesAsync(
    taskName: string,
    options: {
      readonly accuracy: unknown;
      readonly activityType: unknown;
      readonly pausesUpdatesAutomatically: boolean;
      readonly showsBackgroundLocationIndicator: boolean;
    },
  ): Promise<void>;
  stopLocationUpdatesAsync(taskName: string): Promise<void>;
}

export class ExpoLocationClient implements NativeLocationClient {
  private authorizationStatus: LocationAuthorizationStatus = "notDetermined";
  private geofenceOperation: Promise<void> = Promise.resolve();
  private locationUpdatesActive = false;

  public constructor(
    private readonly expo: ExpoLocationModule,
    private readonly tasks: LocationTaskRuntime,
  ) {}

  public async hydrateState(): Promise<void> {
    const [foreground, background, walkActive] = await Promise.all([
      this.expo.getForegroundPermissionsAsync(),
      this.expo.getBackgroundPermissionsAsync(),
      this.expo.hasStartedLocationUpdatesAsync(WALK_LOCATION_TASK_NAME),
    ]);
    const backgroundStatus = mapPermission(background, "background");
    this.authorizationStatus =
      backgroundStatus === "authorizedAlways"
        ? backgroundStatus
        : mapPermission(foreground, "foreground");
    this.locationUpdatesActive = walkActive;
  }

  public getAuthorizationStatus(): LocationAuthorizationStatus {
    return this.authorizationStatus;
  }

  public async requestForegroundAuthorization(): Promise<LocationAuthorizationStatus> {
    this.authorizationStatus = mapPermission(
      await this.expo.requestForegroundPermissionsAsync(),
      "foreground",
    );
    return this.authorizationStatus;
  }

  public async requestBackgroundAuthorization(): Promise<LocationAuthorizationStatus> {
    const background = mapPermission(await this.expo.requestBackgroundPermissionsAsync(), "background");
    this.authorizationStatus = background === "authorizedAlways"
      ? background
      : mapPermission(await this.expo.getForegroundPermissionsAsync(), "foreground");
    return this.authorizationStatus;
  }

  public getCachedRegionPresence(regionId: string): boolean | null {
    return this.tasks.getCachedRegionPresence(regionId);
  }

  public getLastLocation(): LocationSample | null {
    return this.tasks.getLastLocation();
  }

  public async getCurrentLocation(): Promise<LocationSample> {
    const location = await this.expo.getCurrentPositionAsync({
      accuracy: this.expo.Accuracy.High,
    });
    if (location.coords.accuracy === null) {
      throw new Error("Precise location is unavailable");
    }
    return {
      lat: location.coords.latitude,
      lon: location.coords.longitude,
      accuracy: location.coords.accuracy,
      atMs: location.timestamp,
      speedMps: knownOrNull(location.coords.speed),
      courseDeg: knownOrNull(location.coords.heading),
    };
  }

  public confirmRegionPresence(transition: RegionTransition): Promise<void> {
    return this.tasks.confirmRegionPresence(transition);
  }

  public async startGeofencing(
    regions: readonly GeofenceRegion[],
  ): Promise<void> {
    return this.serializeGeofenceOperation(() =>
      this.expo.startGeofencingAsync(
        GEOFENCE_TASK_NAME,
        regions.map((region) => ({
          identifier: region.id,
          latitude: region.latitude,
          longitude: region.longitude,
          radius: region.radiusMeters,
          notifyOnEnter: true,
          notifyOnExit: true,
        })),
      ),
    );
  }

  public async stopGeofencing(): Promise<void> {
    return this.serializeGeofenceOperation(async () => {
      if ((await this.expo.hasStartedGeofencingAsync(GEOFENCE_TASK_NAME)) === false) return;
      await this.expo.stopGeofencingAsync(GEOFENCE_TASK_NAME);
    });
  }

  private serializeGeofenceOperation(operation: () => Promise<void>): Promise<void> {
    const result = this.geofenceOperation.catch(() => undefined).then(operation);
    this.geofenceOperation = result.catch(() => undefined);
    return result;
  }

  public async startLocationUpdates(): Promise<void> {
    await this.expo.startLocationUpdatesAsync(WALK_LOCATION_TASK_NAME, {
      accuracy: this.expo.Accuracy.Balanced,
      activityType: this.expo.ActivityType.Other,
      pausesUpdatesAutomatically: false,
      showsBackgroundLocationIndicator: false,
    });
    this.locationUpdatesActive = true;
  }

  public async stopLocationUpdates(): Promise<void> {
    await this.expo.stopLocationUpdatesAsync(WALK_LOCATION_TASK_NAME);
    this.locationUpdatesActive = false;
  }

  public isLocationUpdatesActive(): boolean {
    return this.locationUpdatesActive;
  }

  public onRegionPresence(
    callback: (transition: RegionTransition) => void,
  ): LocationUnsubscribe {
    return this.tasks.onRegionPresence(callback);
  }

  public onRegionTransition(
    callback: (transition: RegionTransition) => void,
  ): LocationUnsubscribe {
    return this.tasks.onRegionTransition(callback);
  }

  public onLocation(
    callback: (sample: LocationSample) => void,
  ): LocationUnsubscribe {
    return this.tasks.onLocation(callback);
  }
}

function mapPermission(
  response: ExpoPermissionResponse,
  kind: "foreground" | "background",
): LocationAuthorizationStatus {
  if (response.status === "undetermined") {
    return "notDetermined";
  }
  if (response.status === "denied") {
    return "denied";
  }
  if (kind === "background" || response.ios?.scope === "always") {
    return "authorizedAlways";
  }
  return "authorizedWhenInUse";
}
