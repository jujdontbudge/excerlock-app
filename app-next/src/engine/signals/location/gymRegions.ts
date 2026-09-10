import type { GeofenceRegion } from "./LocationProvider";

export const MAX_SAVED_GYMS = 5;
export const GYM_RADIUS_METERS = {
  default: 100,
  min: 50,
  max: 200,
} as const;

export function assertGymRegionsAllowed(
  regions: readonly GeofenceRegion[],
): void {
  if (regions.length > MAX_SAVED_GYMS) {
    throw new Error(`At most ${MAX_SAVED_GYMS} saved gyms can be monitored`);
  }
  if (
    regions.some(
      ({ radiusMeters }) =>
        radiusMeters < GYM_RADIUS_METERS.min ||
        radiusMeters > GYM_RADIUS_METERS.max,
    )
  ) {
    throw new Error(
      `Gym radius must be between ${GYM_RADIUS_METERS.min} and ${GYM_RADIUS_METERS.max} meters`,
    );
  }
}
