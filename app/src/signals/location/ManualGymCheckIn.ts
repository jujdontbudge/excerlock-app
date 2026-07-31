import type { GeofenceRegion, LocationProvider } from "./LocationProvider";

export interface ManualGymCheckIn {
  checkIn(region: GeofenceRegion): Promise<boolean>;
}

export type AppLocationProvider = LocationProvider & ManualGymCheckIn;
