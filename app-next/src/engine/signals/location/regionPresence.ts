import type { GeofenceRegion, LocationSample } from "./LocationProvider";

const EARTH_RADIUS_METERS = 6_371_000;

export function isSampleInsideRegion(
  sample: LocationSample,
  region: GeofenceRegion,
): boolean {
  const latitudeDelta = radians(region.latitude - sample.lat);
  const longitudeDelta = radians(region.longitude - sample.lon);
  const startLatitude = radians(sample.lat);
  const endLatitude = radians(region.latitude);
  const haversine =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(startLatitude) *
      Math.cos(endLatitude) *
      Math.sin(longitudeDelta / 2) ** 2;
  const distanceMeters =
    2 * EARTH_RADIUS_METERS * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));

  return distanceMeters <= region.radiusMeters;
}

function radians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}
