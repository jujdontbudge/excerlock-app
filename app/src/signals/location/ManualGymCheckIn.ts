import type {
  GeofenceRegion,
  LocationProvider,
  LocationSample,
} from "./LocationProvider";

export interface ManualGymCheckIn {
  checkIn(region: GeofenceRegion): Promise<boolean>;
}

/**
 * One foreground fix taken while the user stands in the gym they are saving.
 * Requests When-In-Use permission on first use; never background access.
 */
export interface GymSetupLocator {
  locateForGymSetup(): Promise<LocationSample>;
}

export type AppLocationProvider = LocationProvider &
  ManualGymCheckIn &
  GymSetupLocator;
