import type {
  GeofenceRegion,
  LocationAuthorizationStatus,
  LocationSample,
  LocationUnsubscribe,
  RegionTransition,
} from "./LocationProvider";

/** Narrow boundary implemented by Expo Location and replaced at the OS edge in tests. */
export interface NativeLocationClient {
  getAuthorizationStatus(): LocationAuthorizationStatus;
  requestForegroundAuthorization(): Promise<LocationAuthorizationStatus>;
  requestBackgroundAuthorization(): Promise<LocationAuthorizationStatus>;
  getCachedRegionPresence(regionId: string): boolean | null;
  getLastLocation(): LocationSample | null;
  getCurrentLocation(): Promise<LocationSample>;
  startGeofencing(regions: readonly GeofenceRegion[]): Promise<void>;
  stopGeofencing(): Promise<void>;
  startLocationUpdates(): Promise<void>;
  stopLocationUpdates(): Promise<void>;
  isLocationUpdatesActive(): boolean;
  onRegionPresence(
    callback: (transition: RegionTransition) => void,
  ): LocationUnsubscribe;
  onRegionTransition(
    callback: (transition: RegionTransition) => void,
  ): LocationUnsubscribe;
  onLocation(callback: (sample: LocationSample) => void): LocationUnsubscribe;
}
