import { Coordinates } from '../../ports/PlaceSearch';
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
