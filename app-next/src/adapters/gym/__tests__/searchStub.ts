import { PlaceSearch } from '../../../ports/PlaceSearch';
import { places } from '../../../demo/places';

/**
 * Apple Maps discovery, stubbed. `ExpoLocalSearch` is a Swift module with no simulator-free
 * surface, so its behaviour is a device-verification item (P2-T11); what the adapter does with the
 * answers is what these tests check.
 */
export function searchStub(): PlaceSearch & { queries: string[] } {
  const stub = {
    queries: [] as string[],
    suggest: async (query: string) => {
      stub.queries.push(query);
      return places
        .filter((place) => `${place.name} ${place.address}`.toLowerCase().includes(query.trim().toLowerCase()))
        .map((place) => ({ id: place.id, title: place.name, subtitle: place.address }));
    },
    resolve: async (suggestion: { id: string }) => {
      const place = places.find((candidate) => candidate.id === suggestion.id);
      if (!place) throw new Error('PLACE_NOT_FOUND');
      return place;
    },
    nearbyGyms: async () => places,
    reverseGeocode: async () => '123 N Morgan St, Chicago',
    currentLocation: async () => ({ latitude: 41.884, longitude: -87.652 }),
  };
  return stub;
}
