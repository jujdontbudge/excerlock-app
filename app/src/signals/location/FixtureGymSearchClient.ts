import {
  GYM_SEARCH_RESULT_LIMIT,
  type GymSearchClient,
  type GymSearchResult,
} from "./GymSearchClient";

/**
 * The default `GymSearchClient` everywhere the geocoder is not available —
 * Jest, Expo Go, and the E2E composition — so the gym picker is exercisable
 * without a network round trip. Substring matching over a fixed list is the
 * whole of it; it decides nothing the real geocoder decides.
 */

export const FIXTURE_GYM_RESULTS: readonly GymSearchResult[] = Object.freeze([
  {
    id: "fixture-iron-works",
    name: "Iron Works Gym",
    address: "412 Green St, Champaign, IL",
    latitude: 40.1105,
    longitude: -88.2284,
  },
  {
    id: "fixture-campus-rec",
    name: "Campus Recreation Center",
    address: "1000 Harrison St, Oak Park, IL",
    latitude: 41.8721,
    longitude: -87.7845,
  },
  {
    id: "fixture-northside",
    name: "Northside Fitness Club",
    address: "88 Lake Shore Dr, Chicago, IL",
    latitude: 41.8925,
    longitude: -87.6132,
  },
]);

export class FixtureGymSearchClient implements GymSearchClient {
  public constructor(
    private readonly places: readonly GymSearchResult[] = FIXTURE_GYM_RESULTS,
  ) {}

  public async search(query: string): Promise<readonly GymSearchResult[]> {
    const needle = query.trim().toLowerCase();
    if (needle.length === 0) {
      return [];
    }

    return this.places
      .filter(({ name, address }) =>
        `${name} ${address}`.toLowerCase().includes(needle),
      )
      .slice(0, GYM_SEARCH_RESULT_LIMIT);
  }
}
