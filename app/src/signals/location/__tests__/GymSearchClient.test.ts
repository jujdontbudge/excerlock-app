import { ExpoGymSearchClient, type ExpoGeocodingModule } from "../ExpoGymSearchClient";
import { FixtureGymSearchClient, FIXTURE_GYM_RESULTS } from "../FixtureGymSearchClient";

function geocoder(
  matches: readonly { latitude: number; longitude: number }[],
  addresses: Readonly<Record<string, Record<string, string | null>>> = {},
): ExpoGeocodingModule {
  return {
    geocodeAsync: jest.fn(async () => matches),
    reverseGeocodeAsync: jest.fn(async ({ latitude }) => {
      const address = addresses[String(latitude)];
      return address === undefined ? [] : [address];
    }),
  };
}

describe("ExpoGymSearchClient", () => {
  it("describes each match with the geocoder's name and one address line", async () => {
    const client = new ExpoGymSearchClient(
      geocoder(
        [{ latitude: 40.741, longitude: -73.989 }],
        {
          "40.741": {
            name: "Metro Fitness",
            streetNumber: "350",
            street: "5th Ave",
            city: "New York",
            region: "NY",
            postalCode: "10118",
          },
        },
      ),
    );

    await expect(client.search("Metro Fitness")).resolves.toEqual([
      {
        id: "40.74100,-73.98900",
        name: "Metro Fitness",
        address: "350 5th Ave, New York, NY, 10118",
        latitude: 40.741,
        longitude: -73.989,
      },
    ]);
  });

  it("does not repeat the name inside the address line", async () => {
    const client = new ExpoGymSearchClient(
      geocoder([{ latitude: 1, longitude: 2 }], {
        "1": { name: "350 5th Ave", streetNumber: "350", street: "5th Ave", city: "New York" },
      }),
    );
    const [result] = await client.search("350 5th Ave");

    expect(result).toMatchObject({ name: "350 5th Ave", address: "New York" });
  });

  it("falls back to what the user typed when the geocoder knows no name", async () => {
    const client = new ExpoGymSearchClient(geocoder([{ latitude: 1, longitude: 2 }]));

    await expect(client.search("  Campus Rec  ")).resolves.toEqual([
      { id: "1.00000,2.00000", name: "Campus Rec", address: "", latitude: 1, longitude: 2 },
    ]);
  });

  it("keeps the search alive when the reverse lookup fails", async () => {
    const client = new ExpoGymSearchClient({
      geocodeAsync: async () => [{ latitude: 1, longitude: 2 }],
      reverseGeocodeAsync: async () => {
        throw new Error("Network unavailable");
      },
    });

    await expect(client.search("Campus Rec")).resolves.toMatchObject([
      { name: "Campus Rec", address: "" },
    ]);
  });

  it("asks the geocoder nothing for a blank query", async () => {
    const expo = geocoder([]);
    const client = new ExpoGymSearchClient(expo);

    await expect(client.search("   ")).resolves.toEqual([]);
    expect(expo.geocodeAsync).not.toHaveBeenCalled();
  });

  it("shows only the top matches", async () => {
    const matches = Array.from({ length: 9 }, (_, index) => ({
      latitude: index,
      longitude: index,
    }));
    const client = new ExpoGymSearchClient(geocoder(matches));

    await expect(client.search("gym")).resolves.toHaveLength(5);
  });
});

describe("FixtureGymSearchClient", () => {
  it("matches its fixtures on name or address, case-insensitively", async () => {
    const client = new FixtureGymSearchClient();

    await expect(client.search("iron")).resolves.toMatchObject([
      { name: "Iron Works Gym" },
    ]);
    await expect(client.search("HARRISON")).resolves.toMatchObject([
      { name: "Campus Recreation Center" },
    ]);
  });

  it("finds nothing for a blank or unmatched query", async () => {
    const client = new FixtureGymSearchClient();

    await expect(client.search("  ")).resolves.toEqual([]);
    await expect(client.search("no such place")).resolves.toEqual([]);
  });

  it("can be handed its own results", async () => {
    const only = FIXTURE_GYM_RESULTS[0]!;
    const client = new FixtureGymSearchClient([only]);

    await expect(client.search("gym")).resolves.toEqual([only]);
  });
});
