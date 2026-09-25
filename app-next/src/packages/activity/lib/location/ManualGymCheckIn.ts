import type {
  GeofenceRegion,
  LocationProvider,
  LocationSample,
} from "./LocationProvider";

export interface ManualGymCheckIn {
  checkIn(region: GeofenceRegion): Promise<boolean>;
}

export interface GymSetupLocator {
  locateForGymSetup(): Promise<LocationSample>;
}

export type AppLocationProvider = LocationProvider &
  ManualGymCheckIn &
  GymSetupLocator;
