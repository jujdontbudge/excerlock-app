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
});
