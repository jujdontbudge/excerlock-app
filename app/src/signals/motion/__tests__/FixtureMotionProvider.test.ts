import {
  FixtureMotionProvider,
  type ActivitySample,
  type CadenceSample,
  type MotionFixtureManifest,
} from "..";

describe("FixtureMotionProvider", () => {
  it("implements the MotionProvider stream and query contract from schema events", async () => {
    const manifest: MotionFixtureManifest = {
      name: "provider-contract",
      version: 1,
      description: "History plus live cadence and activity changes.",
      timeline: [
        {
          atMs: -1_000,
          event: "motion.activityChange",
          payload: { activity: "walking", confidence: "high" },
        },
        {
          atMs: 1_000,
          event: "motion.pedometerUpdate",
          payload: { steps: 12, cadence: 1.2 },
        },
        {
          atMs: 2_000,
          event: "motion.activityChange",
          payload: { activity: "stationary", confidence: "medium" },
        },
      ],
    };
    const activityEvents: ActivitySample[] = [];
    const cadenceEvents: CadenceSample[] = [];
    const provider = new FixtureMotionProvider(manifest);
    provider.on("activity", (sample) => activityEvents.push(sample));
    provider.on("cadence", (sample) => cadenceEvents.push(sample));

    expect(provider.getAvailability()).toEqual({
      activity: true,
      cadence: true,
      stepCounting: true,
    });
    expect(provider.getAuthorizationStatus()).toBe("authorized");
    expect(await provider.queryActivity(-2_000, 0)).toEqual([
      {
        classes: ["walking"],
        confidence: "high",
        startedAt: -1_000,
        receivedAt: -1_000,
      },
    ]);

    await provider.start();
    provider.advanceTo(1_000);

    expect(cadenceEvents).toEqual([
      {
        stepsPerSecond: 1.2,
        cumulativeSteps: 12,
        asOf: 1_000,
      },
    ]);
    expect(await provider.querySteps(0, 1_000)).toEqual({ steps: 12 });

    provider.advanceBy(1_000);

    expect(activityEvents).toEqual([
      {
        classes: ["stationary"],
        confidence: "medium",
        startedAt: 2_000,
        receivedAt: 2_000,
      },
    ]);
  });
});
