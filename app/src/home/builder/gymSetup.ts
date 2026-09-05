import {
  GYM_RADIUS_METERS,
  type GymSearchResult,
  type LocationSample,
} from "@/signals";

import type { SavedPlace } from "../store/homeState";

/**
 * Everything the gym step needs from the rest of the app, in one seam: the
 * gyms the user has, the two ways to find a new one, and the three ways to
 * change the list. The step itself reads no store and reaches for no provider,
 * so a test hands it a plain object.
 */
export interface GymSetup {
  readonly savedPlaces: readonly SavedPlace[];
  /** One foreground fix; rejects when permission is refused or no fix arrives. */
  locate(): Promise<LocationSample>;
  search(query: string): Promise<readonly GymSearchResult[]>;
  save(place: SavedPlace): void;
  rename(placeId: string, name: string): void;
  remove(placeId: string): void;
  createId?(): string;
}

/**
 * The one shape a gym is saved in, whichever way it was found: a name and the
 * 100 m circle that manual check-in and auto-detect both compare against.
 * Coordinates stay on device — nothing here is sent anywhere.
 */
export function savedGym(
  id: string,
  name: string,
  at: { readonly latitude: number; readonly longitude: number },
): SavedPlace {
  return {
    id,
    name: name.trim(),
    geofence: {
      latitude: at.latitude,
      longitude: at.longitude,
      radiusMeters: GYM_RADIUS_METERS.default,
    },
  };
}

/** The gym under the user's feet. */
export function gymFromSample(
  id: string,
  name: string,
  sample: LocationSample,
): SavedPlace {
  return savedGym(id, name, { latitude: sample.lat, longitude: sample.lon });
}

/** A gym found by name or address; the typed name wins over the found one. */
export function gymFromSearchResult(
  id: string,
  name: string,
  result: GymSearchResult,
): SavedPlace {
  return savedGym(id, name.trim().length === 0 ? result.name : name, result);
}
