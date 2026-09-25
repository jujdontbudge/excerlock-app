export type Coordinates = { latitude: number; longitude: number };
export type PlaceSuggestion = { id: string; title: string; subtitle: string };
export type PlaceCandidate = Coordinates & { id: string; name: string; address: string };
export interface PlaceSearch {
  suggest(query: string, near?: Coordinates): Promise<PlaceSuggestion[]>;
  resolve(suggestion: PlaceSuggestion): Promise<PlaceCandidate>;
  nearbyGyms(near: Coordinates): Promise<PlaceCandidate[]>;
  reverseGeocode(coordinate: Coordinates): Promise<string | null>;
  currentLocation(requestPermission?: boolean): Promise<Coordinates | null>;
}
