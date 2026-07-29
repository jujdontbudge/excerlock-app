import {
  SCREENTIME_FIXTURE_NAMES,
  FixtureScreenTimeProvider,
  type ScreenTimeFixtureManifest,
} from "..";
import { runScreenTimeProviderContract } from "../testing/providerContract";

const manifest: ScreenTimeFixtureManifest = {
  name: "provider-contract",
  version: 1,
  description: "A spent tick followed by a future tick and day boundary.",
  timeline: [
    {
      atMs: -1_000,
      event: "screentime.tick",
      payload: { thresholdIndex: 1 },
    },
    {
      atMs: 1_000,
      event: "screentime.tick",
      payload: { thresholdIndex: 2 },
    },
    {
      atMs: 2_000,
      event: "screentime.monitorFired",
      payload: { monitor: "dayBoundary" },
    },
  ],
};

runScreenTimeProviderContract("FixtureScreenTimeProvider", () => {
  const provider = new FixtureScreenTimeProvider(manifest);
  return {
    provider,
    advanceTo: (atMs) => provider.advanceTo(atMs),
    dispose: () => provider.dispose(),
  };
});

describe("FixtureScreenTimeProvider catalog", () => {
  it("publishes every canonical Screen Time fixture name", () => {
    expect(SCREENTIME_FIXTURE_NAMES).toEqual([
      "tick-ladder-basic",
      "tick-ladder-jitter",
      "re-arm-race",
    ]);
  });
});
