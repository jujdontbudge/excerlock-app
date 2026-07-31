import {
  FixtureHealthProvider,
  FixtureMotionProvider,
  getSignalFixture,
  type HealthFixtureManifest,
  type MotionFixtureManifest,
} from "@/signals";

import { createHomeSignalFeed } from "../homeSignalFeed";

/** The feed publishes after an async read — let those promises settle. */
async function settle(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 0));
  await new Promise((resolve) => setTimeout(resolve, 0));
}

function health(): FixtureHealthProvider {
  return new FixtureHealthProvider(
    getSignalFixture("health", "day-steps-approaching-5k") as HealthFixtureManifest,
  );
}

function motion(): FixtureMotionProvider {
  return new FixtureMotionProvider(
    getSignalFixture("motion", "steady-walk") as MotionFixtureManifest,
  );
}

function createTestFeed(
  healthProvider: FixtureHealthProvider,
  motionProvider: FixtureMotionProvider,
) {
  return createHomeSignalFeed({
    health: healthProvider,
    motion: motionProvider,
    walking: {
      gracePeriodMs: 30_000,
      now: () => motionProvider.currentTimeMs,
    },
  });
}

describe("createHomeSignalFeed", () => {
  it("claims Health authorization before starting live delivery", async () => {
    const provider = health();
    const requestAuth = jest.spyOn(provider, "requestAuth");
    const feed = createTestFeed(provider, motion());

    await feed.start();

    expect(requestAuth).toHaveBeenCalledTimes(1);
    feed.dispose();
  });

  it("seeds native anchors while claiming existing Health data", async () => {
    const provider = health();
    const getNewSamples = jest.spyOn(provider, "getNewSamples");
    const feed = createTestFeed(provider, motion());

    await feed.start();

    expect(getNewSamples.mock.calls).toEqual([
      ["steps", null],
      ["activeEnergy", null],
      ["appleExerciseTime", null],
      ["walkingRunningDistance", null],
      ["cyclingDistance", null],
      ["swimmingDistance", null],
      ["workout", null],
    ]);
    feed.dispose();
  });

  it("reads today's health totals under the condition model's signal names", async () => {
    const feed = createTestFeed(health(), motion());

    const reading = await feed.read();

    // The fixture's history is 4,800 steps; the user-entered sample is excluded.
    expect(reading.totals.steps).toBe(4_800);
    expect(reading.totals.activeCalories).toBe(0);
    feed.dispose();
  });

  it("picks up a health sample that lands later in the day", async () => {
    const provider = health();
    const feed = createTestFeed(provider, motion());

    provider.advanceTo(120_000);
    const reading = await feed.read();

    expect(reading.totals.steps).toBe(5_050);
    feed.dispose();
  });

  it("waits for sustained cadence after walking classification", async () => {
    const provider = motion();
    const feed = createTestFeed(health(), provider);

    expect((await feed.read()).activeSignals).toEqual([]);

    await feed.start();
    provider.advanceTo(1_000);

    expect((await feed.read()).activeSignals).toEqual([]);

    provider.advanceTo(4_000);

    expect((await feed.read()).activeSignals).toEqual(["walking"]);
    feed.dispose();
  });

  it("drops verified walking after the configured stop grace", async () => {
    const provider = new FixtureMotionProvider(
      getSignalFixture("motion", "stop-for-good") as MotionFixtureManifest,
    );
    const feed = createTestFeed(health(), provider);

    await feed.start();
    provider.advanceTo(4_000);

    expect((await feed.read()).activeSignals).toEqual(["walking"]);

    provider.advanceTo(41_000);

    expect((await feed.read()).activeSignals).toEqual([]);
    feed.dispose();
  });

  it("publishes stop-grace expiry without waiting for another sensor event", async () => {
    jest.useFakeTimers();
    const provider = new FixtureMotionProvider(
      getSignalFixture("motion", "stop-for-good") as MotionFixtureManifest,
    );
    let nowMs = 0;
    const feed = createHomeSignalFeed({
      health: health(),
      motion: provider,
      walking: { gracePeriodMs: 30_000, now: () => nowMs },
    });
    const readings: string[][] = [];

    try {
      feed.subscribe((reading) => readings.push([...reading.activeSignals]));
      await feed.start();
      nowMs = 4_000;
      provider.advanceTo(4_000);
      await jest.advanceTimersByTimeAsync(0);
      expect(readings.at(-1)).toEqual(["walking"]);

      nowMs = 10_000;
      provider.advanceTo(10_000);
      await jest.advanceTimersByTimeAsync(0);
      expect(readings.at(-1)).toEqual(["walking"]);

      nowMs = 40_000;
      await jest.advanceTimersByTimeAsync(30_000);

      expect(readings.at(-1)).toEqual([]);
    } finally {
      feed.dispose();
      jest.useRealTimers();
    }
  });

  it("notifies subscribers when a signal moves", async () => {
    const provider = motion();
    const feed = createTestFeed(health(), provider);
    const readings: string[][] = [];
    feed.subscribe((reading) => readings.push([...reading.activeSignals]));

    await feed.start();
    provider.advanceTo(4_000);
    await settle();

    expect(readings.at(-1)).toEqual(["walking"]);
    feed.dispose();
  });

  it("stops notifying an unsubscribed listener", async () => {
    const provider = motion();
    const feed = createTestFeed(health(), provider);
    const readings: unknown[] = [];
    const unsubscribe = feed.subscribe((reading) => readings.push(reading));

    await feed.start();
    unsubscribe();
    provider.advanceTo(1_000);
    await settle();

    expect(readings).toEqual([]);
    feed.dispose();
  });

  it("survives a motion provider that refuses to start", async () => {
    const denied = new FixtureMotionProvider(
      getSignalFixture("motion", "denied-permission") as MotionFixtureManifest,
    );
    denied.advanceTo(1_000);
    const feed = createTestFeed(health(), denied);

    await expect(feed.start()).resolves.toBeUndefined();
    expect((await feed.read()).activeSignals).toEqual([]);
    feed.dispose();
  });
});
