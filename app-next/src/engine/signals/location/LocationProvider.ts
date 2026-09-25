export type LocationAuthorizationStatus =
  | "notDetermined"
  | "restricted"
  | "denied"
  | "authorizedWhenInUse"
  | "authorizedAlways";

export interface GeofenceRegion {
  readonly id: string;
  readonly latitude: number;
  readonly longitude: number;
  readonly radiusMeters: number;
}

export interface LocationSample {
  readonly lat: number;
  readonly lon: number;
  readonly accuracy: number;
  readonly atMs: number;
  readonly speedMps: number | null;
  readonly courseDeg: number | null;
}

export interface RegionTransition {
  readonly type: "enter" | "exit";
  readonly regionId: string;
  readonly atMs: number;
}

export type LocationUnsubscribe = () => void;

export interface LocationProvider {
  requestAuthorization(): Promise<LocationAuthorizationStatus>;
  requestAlwaysAuthorization(): Promise<LocationAuthorizationStatus>;
  getAuthorizationStatus(): LocationAuthorizationStatus;
  refreshAuthorization(): Promise<LocationAuthorizationStatus>;
  startMonitoringRegions(regions: readonly GeofenceRegion[]): Promise<void>;
  stopMonitoringRegions(regionIds?: readonly string[]): Promise<void>;
  isInsideRegion(regionId: string): boolean | null;
  getLastLocation(): LocationSample | null;
  startWalkKeepAlive(): Promise<void>;
  stopWalkKeepAlive(): Promise<void>;
  isWalkKeepAliveActive(): boolean;
  on(
    event: "region",
    callback: (transition: RegionTransition) => void,
  ): LocationUnsubscribe;
  on(
    event: "location",
    callback: (sample: LocationSample) => void,
  ): LocationUnsubscribe;
  on(
    event: "authorization",
    callback: (status: LocationAuthorizationStatus) => void,
  ): LocationUnsubscribe;
}
