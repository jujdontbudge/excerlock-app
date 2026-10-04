import { Coordinates } from '../ports/PlaceSearch';
export type MapRegion = Coordinates & { latitudeDelta: number; longitudeDelta: number };
export type MapSize = { width: number; height: number };
const radians = (degrees: number) => (degrees * Math.PI) / 180;
export function metresToPoints(region: MapRegion, width: number, metres: number) {
  'worklet';
  return (
    (metres * width) / Math.max(0.001, region.longitudeDelta * 111320 * Math.cos((region.latitude * Math.PI) / 180))
  );
}
export function distanceMetres(a: Coordinates, b: Coordinates) {
  const h =
    Math.sin(radians(b.latitude - a.latitude) / 2) ** 2 +
    Math.cos(radians(a.latitude)) *
      Math.cos(radians(b.latitude)) *
      Math.sin(radians(b.longitude - a.longitude) / 2) ** 2;
  return 6371000 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(Math.max(0, 1 - h)));
}
export function regionForRadius(centre: Coordinates, metres: number, size: MapSize): MapRegion {
  const span = metres * 2.7;
  const shortest = Math.max(1, Math.min(size.width, size.height));
  return {
    ...centre,
    latitudeDelta: ((span / 111320) * size.height) / shortest,
    longitudeDelta: ((span / (111320 * Math.max(0.01, Math.cos(radians(centre.latitude))))) * size.width) / shortest,
  };
}
export const roundCoordinate = (c: Coordinates) => `${c.latitude.toFixed(4)},${c.longitude.toFixed(4)}`;
export const clampRadius = (n: number) =>
  Math.min(200, Math.max(50, Math.round((Number.isFinite(n) ? n : 100) / 10) * 10));
export function circleEdge(gym: Coordinates, radius: number, user: Coordinates): Coordinates {
  const lat = radians(gym.latitude), lon = radians(gym.longitude), targetLat = radians(user.latitude);
  const delta = radians(user.longitude - gym.longitude);
  const bearing = Math.atan2(Math.sin(delta) * Math.cos(targetLat), Math.cos(lat) * Math.sin(targetLat) - Math.sin(lat) * Math.cos(targetLat) * Math.cos(delta));
  const angle = radius / 6371000;
  const endLat = Math.asin(Math.sin(lat) * Math.cos(angle) + Math.cos(lat) * Math.sin(angle) * Math.cos(bearing));
  const endLon = lon + Math.atan2(Math.sin(bearing) * Math.sin(angle) * Math.cos(lat), Math.cos(angle) - Math.sin(lat) * Math.sin(endLat));
  return { latitude: endLat * 180 / Math.PI, longitude: (endLon * 180 / Math.PI + 540) % 360 - 180 };
}
export function gymMapRegion(gym: Coordinates, radius: number, user: Coordinates | null, size: MapSize, padding: number): MapRegion {
  const latitudeRadius = radius / 111320;
  const longitudeRadius = latitudeRadius / Math.max(0.01, Math.cos(radians(gym.latitude)));
  const userLongitude = user ? gym.longitude + ((user.longitude - gym.longitude + 540) % 360 - 180) : gym.longitude;
  const south = Math.min(gym.latitude - latitudeRadius, user?.latitude ?? gym.latitude);
  const north = Math.max(gym.latitude + latitudeRadius, user?.latitude ?? gym.latitude);
  const west = Math.min(gym.longitude - longitudeRadius, userLongitude);
  const east = Math.max(gym.longitude + longitudeRadius, userLongitude);
  const width = Math.max(1, size.width - padding * 2), height = Math.max(1, size.height - padding * 2);
  const latitude = (south + north) / 2;
  const span = Math.max((north - south) / height, (east - west) * Math.cos(radians(latitude)) / width);
  return { latitude, longitude: ((west + east) / 2 + 540) % 360 - 180, latitudeDelta: Math.min(180, span * size.height), longitudeDelta: Math.min(360, span * size.width / Math.max(0.01, Math.cos(radians(latitude)))) };
}
export function pointInMap(point: Coordinates, region: MapRegion): boolean {
  return Math.abs(point.latitude - region.latitude) < region.latitudeDelta / 2 && Math.abs((point.longitude - region.longitude + 540) % 360 - 180) < region.longitudeDelta / 2;
}
