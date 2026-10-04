import type {
  GeofenceRegion,
  LocationProvider,
  LocationSample,
} from "./LocationProvider";

export interface ManualGymCheckIn {
  recheck(region: GeofenceRegion): Promise<void>;
  checkIn(region: GeofenceRegion, confirmation?: { milliseconds: number; signal: AbortSignal }): Promise<boolean>;
}

export interface GymSetupLocator {
  locateForGymSetup(): Promise<LocationSample>;
}

export type AppLocationProvider = LocationProvider &
  ManualGymCheckIn &
  GymSetupLocator;
