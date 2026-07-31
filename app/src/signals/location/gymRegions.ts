import type { GeofenceRegion } from "./LocationProvider";

export const MAX_SAVED_GYMS = 5;

export function assertGymRegionsAllowed(
  regions: readonly GeofenceRegion[],
): void {
  if (regions.length > MAX_SAVED_GYMS) {
    throw new Error(`At most ${MAX_SAVED_GYMS} saved gyms can be monitored`);
  }
}
