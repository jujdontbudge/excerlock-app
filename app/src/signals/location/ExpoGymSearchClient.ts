import {
  GYM_SEARCH_RESULT_LIMIT,
  type GymSearchClient,
  type GymSearchResult,
} from "./GymSearchClient";

/**
 * `GymSearchClient` over `expo-location`'s geocoder — the only module that
 * translates those calls, the way `ExpoLocationClient` owns the rest of the SDK.
 *
 * `geocodeAsync` answers with coordinates alone, so each match is described by
 * one reverse lookup. A failed description never fails the search: an address
 * the geocoder will not name is still a place the user can save.
 */

export interface ExpoGeocodedLocation {
  readonly latitude: number;
  readonly longitude: number;
}

export interface ExpoGeocodedAddress {
  readonly name?: string | null;
  readonly street?: string | null;
  readonly streetNumber?: string | null;
  readonly city?: string | null;
  readonly region?: string | null;
  readonly postalCode?: string | null;
}

export interface ExpoGeocodingModule {
  geocodeAsync(address: string): Promise<readonly ExpoGeocodedLocation[]>;
  reverseGeocodeAsync(
    location: ExpoGeocodedLocation,
  ): Promise<readonly ExpoGeocodedAddress[]>;
}

export class ExpoGymSearchClient implements GymSearchClient {
  public constructor(
    private readonly expo: ExpoGeocodingModule,
    private readonly limit: number = GYM_SEARCH_RESULT_LIMIT,
  ) {}

  public async search(query: string): Promise<readonly GymSearchResult[]> {
    const trimmed = query.trim();
    if (trimmed.length === 0) {
      return [];
    }

    const matches = await this.expo.geocodeAsync(trimmed);
    return Promise.all(
      matches.slice(0, this.limit).map((match) => this.describe(trimmed, match)),
    );
  }

  private async describe(
    query: string,
    match: ExpoGeocodedLocation,
  ): Promise<GymSearchResult> {
    const address = await this.reverseGeocode(match);
    const name = text(address?.name) ?? query;

    return {
      id: `${match.latitude.toFixed(5)},${match.longitude.toFixed(5)}`,
      name,
      address: addressLine(address, name),
      latitude: match.latitude,
      longitude: match.longitude,
    };
  }

  private async reverseGeocode(
    match: ExpoGeocodedLocation,
  ): Promise<ExpoGeocodedAddress | undefined> {
    try {
      return (await this.expo.reverseGeocodeAsync(match))[0];
    } catch {
      return undefined;
    }
  }
}

/** The address without the part the name already said. */
function addressLine(
  address: ExpoGeocodedAddress | undefined,
  name: string,
): string {
  const street = [text(address?.streetNumber), text(address?.street)]
    .filter(present)
    .join(" ");
  const parts = [
    street,
    text(address?.city),
    text(address?.region),
    text(address?.postalCode),
  ].filter(present);

  return parts.filter((part) => part !== name).join(", ");
}

function text(value: string | null | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed === undefined || trimmed.length === 0 ? undefined : trimmed;
}

function present(value: string | undefined): value is string {
  return value !== undefined && value.length > 0;
}
