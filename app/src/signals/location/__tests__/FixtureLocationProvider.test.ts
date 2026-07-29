import {
  LOCATION_FIXTURE_NAMES,
  FixtureLocationProvider,
  type LocationFixtureManifest,
  type RegionTransition,
} from "..";

describe("FixtureLocationProvider", () => {
  it("tracks history presence and emits monitored location and region changes", async () => {
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
    const provider = new FixtureLocationProvider(manifest);
    const transitions: RegionTransition[] = [];
    provider.on("region", (transition) => transitions.push(transition));
    await provider.startMonitoringRegions([
      {
        id: "gym-a",
        latitude: 40.741,
        longitude: -73.989,
        radiusMeters: 100,
      },
    ]);

    expect(provider.isInsideRegion("gym-a")).toBe(true);
    await provider.startWalkKeepAlive();
    expect(provider.isWalkKeepAliveActive()).toBe(true);

    provider.advanceTo(2_000);

    expect(provider.getLastLocation()).toEqual({
      lat: 40.741,
      lon: -73.989,
      accuracy: 8,
      atMs: 1_000,
    });
    expect(transitions).toEqual([
      { type: "exit", regionId: "gym-a", atMs: 2_000 },
    ]);
    expect(provider.isInsideRegion("gym-a")).toBe(false);

    await provider.stopWalkKeepAlive();
    expect(provider.isWalkKeepAliveActive()).toBe(false);
  });

  it("publishes every canonical Location fixture name", () => {
    expect(LOCATION_FIXTURE_NAMES).toEqual([
      "gym-enter-exit",
      "region-blip",
      "quiet",
    ]);
  });
});
