/**
 * Finding a gym by name or address, so a rule can be built at home instead of
 * while standing in the gym (#134).
 *
 * The contract is deliberately one method: a query in, a short list of places
 * out. Consumers never learn which geocoder answered, and no coordinate leaves
 * the device — the query is the only thing that reaches the platform lookup.
 */

export interface GymSearchResult {
  /** Stable inside one result set: the row key and nothing else. */
  readonly id: string;
  /** The place's own label, and the name a gym saved from it starts with. */
  readonly name: string;
  /** One readable line, or empty when the lookup knows no address. */
  readonly address: string;
  readonly latitude: number;
  readonly longitude: number;
}

export interface GymSearchClient {
  /** Top matches, best first. A blank or unmatched query finds none. */
  search(query: string): Promise<readonly GymSearchResult[]>;
}

/** A phone-sized list — the picker shows every match it is given. */
export const GYM_SEARCH_RESULT_LIMIT = 5;
