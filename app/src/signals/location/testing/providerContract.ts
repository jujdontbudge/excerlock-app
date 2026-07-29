import type {
  LocationProvider,
  RegionTransition,
} from "..";

export interface LocationProviderHarness {
  readonly provider: LocationProvider;
  advanceTo(atMs: number): void;
  dispose(): void;
}

export function runLocationProviderContract(
  implementation: string,
  createHarness: () => LocationProviderHarness,
): void {
  describe(`${implementation} LocationProvider contract`, () => {
    it("tracks presence, location, region changes, and walk keep-alive", async () => {
      const harness = createHarness();
      const transitions: RegionTransition[] = [];
      harness.provider.on("region", (transition) =>
        transitions.push(transition),
      );
      await harness.provider.startMonitoringRegions([
        {
          id: "gym-a",
          latitude: 40.741,
          longitude: -73.989,
          radiusMeters: 100,
        },
      ]);

      expect(harness.provider.isInsideRegion("gym-a")).toBe(true);
      await harness.provider.startWalkKeepAlive();
      expect(harness.provider.isWalkKeepAliveActive()).toBe(true);

      harness.advanceTo(2_000);

      expect(harness.provider.getLastLocation()).toEqual({
        lat: 40.741,
        lon: -73.989,
        accuracy: 8,
        atMs: 1_000,
      });
      expect(transitions).toEqual([
        { type: "exit", regionId: "gym-a", atMs: 2_000 },
      ]);
      expect(harness.provider.isInsideRegion("gym-a")).toBe(false);

      await harness.provider.stopWalkKeepAlive();
      expect(harness.provider.isWalkKeepAliveActive()).toBe(false);
      harness.dispose();
    });
  });
}
