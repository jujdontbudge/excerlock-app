import { Unsubscribe, SavedPlace } from './models';
export interface GymPort {
  searchPlaces(query: string): Promise<SavedPlace[]>;
  savePlace(place: SavedPlace): Promise<void>;
  listPlaces(): SavedPlace[];
  checkIn(placeId: string): Promise<void>;
  enableAutoDetect(): Promise<boolean>;
  disableAutoDetect(): void;
  observePresence(callback: (presence: 'inside' | 'outside') => void): Unsubscribe;
}
