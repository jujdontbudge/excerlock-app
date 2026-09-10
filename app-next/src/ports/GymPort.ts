import { Permissions } from '../domain/types';
import { Unsubscribe, SavedPlace } from './models';
import { PlaceSearch, Coordinates } from './PlaceSearch';
export interface GymPort extends PlaceSearch {
  requestLocation(): Promise<Permissions['location']>;
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
