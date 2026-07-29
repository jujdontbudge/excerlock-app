import {
  FixtureHealthProvider,
  FixtureLocationProvider,
  FixtureMotionProvider,
  FixtureScreenTimeProvider,
  FixtureVendorProvider,
} from "@/signals";

import {
  createFixtureProviderComposition,
  getScenarioManifest,
} from "..";

describe("E2E SignalKit composition root", () => {
  it("constructs every SignalKit fixture provider once from the scenario", () => {
    const composition = createFixtureProviderComposition(
      getScenarioManifest("baseline-fresh-install"),
    );

    expect(composition.providers).toEqual({
      health: expect.any(FixtureHealthProvider),
      motion: expect.any(FixtureMotionProvider),
      location: expect.any(FixtureLocationProvider),
      screentime: expect.any(FixtureScreenTimeProvider),
      vendor: expect.any(FixtureVendorProvider),
    });
    expect(composition.clock.nowMs()).toBe(
      Date.parse("2026-07-29T09:41:00-04:00"),
    );
    expect(composition.selectedFixtures).toEqual({
      health: "background-wake-replay",
      motion: "steady-walk",
      location: "quiet",
      screentime: "tick-ladder-basic",
      vendor: "none-connected",
    });

    composition.dispose();
  });
});
