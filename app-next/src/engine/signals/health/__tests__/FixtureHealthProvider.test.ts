import {
  HEALTH_FIXTURE_NAMES,
  FixtureHealthProvider,
  type HealthFixtureManifest,
} from "..";
import { runHealthProviderContract } from "../testing/providerContract";

const manifest: HealthFixtureManifest = {
  name: "provider-contract",
  version: 1,
  description: "Sample history followed by a wake and another sample.",
  timeline: [
    {
      atMs: -1_000,
      event: "health.samplesAdded",
      payload: {
        signal: "steps",
        samples: [
          {
            value: 100,
            startISO: "2026-07-29T08:00:00-04:00",
            endISO: "2026-07-29T08:05:00-04:00",
            sourceRevision: { bundleIdentifier: "com.apple.health" },
            wasUserEntered: false,
          },
          {
            value: 900,
            startISO: "2026-07-29T08:05:00-04:00",
            endISO: "2026-07-29T08:06:00-04:00",
            sourceRevision: { bundleIdentifier: "com.apple.health" },
            wasUserEntered: true,
          },
        ],
      },
    },
    {
      atMs: 1_000,
      event: "health.backgroundWake",
      payload: { signal: "steps" },
    },
    {
      atMs: 2_000,
      event: "health.samplesAdded",
      payload: {
        signal: "steps",
        samples: [
          {
            value: 50,
            startISO: "2026-07-29T08:06:00-04:00",
            endISO: "2026-07-29T08:07:00-04:00",
            sourceRevision: { bundleIdentifier: "com.apple.health" },
            wasUserEntered: false,
          },
        ],
      },
    },
  ],
};

runHealthProviderContract("FixtureHealthProvider", () => {
  const provider = new FixtureHealthProvider(manifest);
  return {
    provider,
    advanceTo: (atMs) => provider.advanceTo(atMs),
    dispose: () => provider.dispose(),
  };
});

describe("FixtureHealthProvider catalog", () => {
  it("publishes every canonical Health fixture name", () => {
    expect(HEALTH_FIXTURE_NAMES).toEqual([
      "day-mixed-sources",
      "manual-entry-day",
      "background-wake-replay",
      "day-steps-approaching-5k",
    ]);
  });
});
