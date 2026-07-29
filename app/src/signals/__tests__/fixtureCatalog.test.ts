import {
  SIGNAL_FIXTURE_CATALOG,
  FixtureHealthProvider,
  FixtureLocationProvider,
  FixtureMotionProvider,
  FixtureScreenTimeProvider,
  FixtureVendorProvider,
  getSignalFixture,
} from "..";

describe("SignalKit fixture catalog", () => {
  it("resolves and validates every canonical JSON manifest through its provider", () => {
    Object.entries(SIGNAL_FIXTURE_CATALOG.health).forEach(([name, fixture]) => {
      expect(fixture.name).toBe(name);
      new FixtureHealthProvider(fixture).dispose();
    });
    Object.entries(SIGNAL_FIXTURE_CATALOG.motion).forEach(([name, fixture]) => {
      expect(fixture.name).toBe(name);
      new FixtureMotionProvider(fixture).dispose();
    });
    Object.entries(SIGNAL_FIXTURE_CATALOG.location).forEach(
      ([name, fixture]) => {
        expect(fixture.name).toBe(name);
        new FixtureLocationProvider(fixture).dispose();
      },
    );
    Object.entries(SIGNAL_FIXTURE_CATALOG.screentime).forEach(
      ([name, fixture]) => {
        expect(fixture.name).toBe(name);
        new FixtureScreenTimeProvider(fixture).dispose();
      },
    );
    Object.entries(SIGNAL_FIXTURE_CATALOG.vendor).forEach(([name, fixture]) => {
      expect(fixture.name).toBe(name);
      new FixtureVendorProvider(fixture).dispose();
    });
  });

  it("fails fast when a scenario names an unknown fixture", () => {
    expect(() => getSignalFixture("motion", "unknown-story")).toThrow(
      'Unknown motion fixture "unknown-story"',
    );
  });

  it("rejects invented payload fields before a future row can play", () => {
    expect(
      () =>
        new FixtureMotionProvider({
          name: "invalid-future-payload",
          version: 1,
          description: "A future motion row with a field outside the schema.",
          timeline: [
            {
              atMs: 10_000,
              event: "motion.pedometerUpdate",
              payload: {
                steps: 10,
                cadence: 1.7,
                invented: true,
              },
            },
          ],
        } as never),
    ).toThrow("Invalid payload fields for motion.pedometerUpdate");
  });
});
