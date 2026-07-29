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

describe("createHomeSignalFeed", () => {
  it("reads today's health totals under the condition model's signal names", async () => {
    const feed = createHomeSignalFeed({ health: health(), motion: motion() });

    const reading = await feed.read();

    // The fixture's history is 4,800 steps; the user-entered sample is excluded.
    expect(reading.totals.steps).toBe(4_800);
    expect(reading.totals.activeCalories).toBe(0);
    feed.dispose();
  });

  it("picks up a health sample that lands later in the day", async () => {
    const provider = health();
    const feed = createHomeSignalFeed({ health: provider, motion: motion() });

    provider.advanceTo(120_000);
    const reading = await feed.read();

    expect(reading.totals.steps).toBe(5_050);
    feed.dispose();
  });

  it("reports walking as an active signal once the classifier says so", async () => {
    const provider = motion();
    const feed = createHomeSignalFeed({ health: health(), motion: provider });

    expect((await feed.read()).activeSignals).toEqual([]);

    await feed.start();
    provider.advanceTo(1_000);

    expect((await feed.read()).activeSignals).toEqual(["walking"]);
    feed.dispose();
  });

  it("drops walking again when the classifier moves on", async () => {
    const provider = new FixtureMotionProvider({
      name: "walk-then-stop",
      version: 1,
      description: "Walking, then stationary.",
      timeline: [
        { atMs: 1_000, event: "motion.activityChange", payload: { activity: "walking", confidence: "high" } },
        { atMs: 2_000, event: "motion.activityChange", payload: { activity: "stationary", confidence: "high" } },
      ],
    });
    const feed = createHomeSignalFeed({ health: health(), motion: provider });

    await feed.start();
    provider.advanceTo(2_000);

    expect((await feed.read()).activeSignals).toEqual([]);
    feed.dispose();
  });

  it("notifies subscribers when a signal moves", async () => {
    const provider = motion();
    const feed = createHomeSignalFeed({ health: health(), motion: provider });
    const readings: string[][] = [];
    feed.subscribe((reading) => readings.push([...reading.activeSignals]));

    await feed.start();
    provider.advanceTo(1_000);
    await settle();

    expect(readings.at(-1)).toEqual(["walking"]);
    feed.dispose();
  });

  it("stops notifying an unsubscribed listener", async () => {
    const provider = motion();
    const feed = createHomeSignalFeed({ health: health(), motion: provider });
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
    const feed = createHomeSignalFeed({ health: health(), motion: denied });

    await expect(feed.start()).resolves.toBeUndefined();
    expect((await feed.read()).activeSignals).toEqual([]);
    feed.dispose();
  });
});
