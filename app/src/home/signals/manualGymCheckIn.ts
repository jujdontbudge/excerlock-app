import {
  getLocationProvider,
  type GeofenceRegion,
} from "@/signals";

/**
 * Foreground action boundary for the default gym tier. Importing this module
 * does no location work; the native provider is selected only after a person
 * presses the gym card's check-in action.
 */
export function manualGymCheckIn(region: GeofenceRegion): Promise<boolean> {
  return getLocationProvider().checkIn(region);
}
