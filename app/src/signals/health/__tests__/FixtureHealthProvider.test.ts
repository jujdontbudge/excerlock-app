import {
  HEALTH_FIXTURE_NAMES,
  FixtureHealthProvider,
  type HealthChange,
  type HealthFixtureManifest,
} from "..";

describe("FixtureHealthProvider", () => {
  it("replays anchored samples, excludes manual entries from totals, and emits future wakes", async () => {
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
    const provider = new FixtureHealthProvider(manifest);
    const initial = await provider.getNewSamples("steps", null);
    const changes: HealthChange[] = [];
    provider.onChange("steps", (change) => changes.push(change));

    expect(initial.samples).toHaveLength(2);
    expect(initial.samples[1].wasUserEntered).toBe(true);
    expect(await provider.getTodayTotal("steps")).toBe(100);

    provider.advanceTo(2_000);

    expect(changes.map((change) => change.reason)).toEqual([
      "backgroundWake",
      "samplesAdded",
    ]);
    expect(
      await provider.getNewSamples("steps", initial.anchor),
    ).toMatchObject({
      samples: [{ value: 50, wasUserEntered: false }],
    });
    expect(await provider.getTodayTotal("steps")).toBe(150);
  });

  it("publishes every canonical Health fixture name", () => {
    expect(HEALTH_FIXTURE_NAMES).toEqual([
      "day-mixed-sources",
      "manual-entry-day",
      "background-wake-replay",
      "day-steps-approaching-5k",
    ]);
  });
});
