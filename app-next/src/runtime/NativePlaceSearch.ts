import { requireOptionalNativeModule } from 'expo';
import { PlaceSearch, Coordinates, PlaceCandidate, PlaceSuggestion } from '../ports/PlaceSearch';
import { Permissions } from '../domain/types';
import { permissionsStore } from '../state/permissionsStore';
interface NativeSearch {
  suggest(query: string, latitude: number | null, longitude: number | null): Promise<PlaceSuggestion[]>;
  resolve(id: string, title: string, subtitle: string): Promise<PlaceCandidate>;
  nearbyGyms(latitude: number, longitude: number): Promise<PlaceCandidate[]>;
  reverseGeocode(latitude: number, longitude: number): Promise<string | null>;
  currentLocation(request: boolean): Promise<Coordinates | null>;
  locationPermission(): Promise<Permissions['location']>;
}
export async function requestNativeLocation(): Promise<Permissions['location']> {
  await native().currentLocation(true);
  const permission = await native().locationPermission();
  permissionsStore.getState().patch({ location: permission });
  return permission;
}
function native(): NativeSearch {
  const module = requireOptionalNativeModule<NativeSearch>('ExpoLocalSearch');
  if (!module) throw new Error('Place search needs the updated iOS development build.');
  return module;
}
export const nativePlaceSearch: PlaceSearch = {
  suggest: async (query, near) => native().suggest(query, near?.latitude ?? null, near?.longitude ?? null),
  resolve: async (s) => native().resolve(s.id, s.title, s.subtitle),
  nearbyGyms: async (c) => native().nearbyGyms(c.latitude, c.longitude),
  reverseGeocode: async (c) => native().reverseGeocode(c.latitude, c.longitude),
  currentLocation: async (request = false) => native().currentLocation(request),
};
