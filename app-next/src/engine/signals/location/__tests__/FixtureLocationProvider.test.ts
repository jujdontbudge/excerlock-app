import {
  LOCATION_FIXTURE_NAMES,
  FixtureLocationProvider,
  type LocationFixtureManifest,
} from "..";
import { runLocationProviderContract } from "../testing/providerContract";

const manifest: LocationFixtureManifest = {
  name: "provider-contract",
  version: 1,
  description: "Already inside, then a location update and exit.",
  timeline: [
    {
      atMs: -1_000,
      event: "location.enterRegion",
      payload: { regionId: "gym-a" },
    },
    {
      atMs: 1_000,
      event: "location.update",
      payload: { lat: 40.741, lon: -73.989, accuracy: 8 },
    },
    {
      atMs: 2_000,
      event: "location.exitRegion",
      payload: { regionId: "gym-a" },
    },
  ],
};

runLocationProviderContract("FixtureLocationProvider", () => {
  const provider = new FixtureLocationProvider(manifest);
  return {
    provider,
    advanceTo: (atMs) => provider.advanceTo(atMs),
    dispose: () => provider.dispose(),
  };
});

describe("FixtureLocationProvider catalog", () => {
  it("publishes every canonical Location fixture name", () => {
    expect(LOCATION_FIXTURE_NAMES).toEqual([
      "gym-enter-exit",
      "region-blip",
      "quiet",
    ]);
  });
});
