import type {
  GeofenceRegion,
  LocationAuthorizationStatus,
  LocationSample,
  LocationUnsubscribe,
  RegionTransition,
} from "./LocationProvider";

export interface NativeLocationClient {
  hydrateState(): Promise<void>;
  getAuthorizationStatus(): LocationAuthorizationStatus;
  requestForegroundAuthorization(): Promise<LocationAuthorizationStatus>;
  requestBackgroundAuthorization(): Promise<LocationAuthorizationStatus>;
  getCachedRegionPresence(regionId: string): boolean | null;
  getLastLocation(): LocationSample | null;
  getCurrentLocation(): Promise<LocationSample>;
  confirmRegionPresence(transition: RegionTransition): Promise<void>;
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
