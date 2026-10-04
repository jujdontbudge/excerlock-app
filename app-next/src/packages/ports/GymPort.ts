import { Permissions } from '../model/types';
import { Unsubscribe, SavedPlace } from '../model/models';
import { PlaceSearch, Coordinates } from './PlaceSearch';
export type GymLocationFix = Coordinates & { accuracy: number; atMs: number };
export interface GymPort extends PlaceSearch {
  currentFix(request?: boolean): Promise<GymLocationFix | null>;
  lastKnownLocation?(): Coordinates | null;
  requestLocation(): Promise<Permissions['location']>;
  requestBackgroundLocation(): Promise<Permissions['location']>;
  searchPlaces(query: string): Promise<SavedPlace[]>;
  savePlace(place: SavedPlace): Promise<void>;
  listPlaces(): SavedPlace[];
  checkIn(placeId: string, confirmation?: { milliseconds: number; signal: AbortSignal }): Promise<void>;
  enableAutoDetect(): Promise<boolean>;
  disableAutoDetect(): Promise<void>;
  observePresence(callback: (presence: 'inside' | 'outside') => void): Unsubscribe;
  observeLocation(callback: (location: Coordinates | null) => void): Unsubscribe;
  distanceTo(placeId: string): number | null;
}
