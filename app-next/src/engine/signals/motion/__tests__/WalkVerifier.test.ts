import {
  WALK_CADENCE_FRESHNESS_MS,
  WALK_CADENCE_THRESHOLD_STEPS_PER_MINUTE,
  WalkVerifier,
  type ActivitySample,
} from "..";

function activity(
  classes: ActivitySample["classes"],
  startedAt: number,
  receivedAt = startedAt,
): ActivitySample {
  return {
    classes,
    confidence: "high",
    startedAt,
    receivedAt,
  };
}

describe("WalkVerifier", () => {
  it("requires walking classification and the app-fixed cadence threshold", () => {
    const verifier = new WalkVerifier({ gracePeriodMs: 30_000 });

    verifier.processActivity(activity(["walking"], 0));
    expect(
      verifier.processCadence({
        stepsPerSecond:
          (WALK_CADENCE_THRESHOLD_STEPS_PER_MINUTE - 1) / 60,
        cumulativeSteps: 1,
        asOf: 1_000,
      }),
    ).toEqual({
      isWalking: false,
      phase: "notWalking",
      evaluatedAt: 1_000,
    });

    expect(
      verifier.processCadence({
        stepsPerSecond: WALK_CADENCE_THRESHOLD_STEPS_PER_MINUTE / 60,
        cumulativeSteps: 3,
        asOf: 2_000,
      }),
    ).toEqual({
      isWalking: false,
      phase: "notWalking",
      evaluatedAt: 2_000,
    });

    expect(
      verifier.processCadence({
        stepsPerSecond: WALK_CADENCE_THRESHOLD_STEPS_PER_MINUTE / 60,
        cumulativeSteps: 4,
        asOf: 3_000,
      }),
    ).toEqual({
      isWalking: true,
      phase: "verified",
      evaluatedAt: 3_000,
    });
  });

  it("uses activity startedAt for stop grace and disqualifies automotive immediately", () => {
    const verifier = new WalkVerifier({ gracePeriodMs: 30_000 });
    verifier.processActivity(activity(["walking"], 0));
    verifier.processCadence({
      stepsPerSecond: 1.7,
      cumulativeSteps: 4,
      asOf: 1_000,
    });
    verifier.processCadence({
      stepsPerSecond: 1.7,
      cumulativeSteps: 6,
      asOf: 2_000,
    });

    expect(
      verifier.processActivity(activity(["stationary"], 5_000, 10_000)),
    ).toEqual({
      isWalking: true,
      phase: "grace",
      evaluatedAt: 10_000,
      graceEndsAt: 35_000,
    });
    expect(verifier.getVerdict(35_000)).toEqual({
      isWalking: false,
      phase: "notWalking",
      evaluatedAt: 35_000,
    });

    expect(
      verifier.processActivity(activity(["walking"], 36_000)),
    ).toEqual({
      isWalking: false,
      phase: "notWalking",
      evaluatedAt: 36_000,
    });
    expect(
      verifier.processCadence({
        stepsPerSecond: 1.7,
        cumulativeSteps: 8,
        asOf: 36_500,
      }),
    ).toEqual({
      isWalking: false,
      phase: "notWalking",
      evaluatedAt: 36_500,
    });
    expect(
      verifier.processCadence({
        stepsPerSecond: 1.7,
        cumulativeSteps: 9,
        asOf: 36_800,
      }),
    ).toEqual({
      isWalking: true,
      phase: "verified",
      evaluatedAt: 36_800,
    });
    expect(
      verifier.processActivity(
        activity(["walking", "automotive"], 37_000),
      ),
    ).toEqual({
      isWalking: false,
      phase: "notWalking",
      evaluatedAt: 37_000,
    });
  });

  it("moves verified walking into grace when cadence evidence becomes stale", () => {
    const verifier = new WalkVerifier({ gracePeriodMs: 30_000 });
    verifier.processActivity(activity(["walking"], 0));
    verifier.processCadence({
      stepsPerSecond: 1.7,
      cumulativeSteps: 4,
      asOf: 1_000,
    });
    verifier.processCadence({
      stepsPerSecond: 1.7,
      cumulativeSteps: 6,
      asOf: 2_000,
    });

    expect(
      verifier.getVerdict(2_000 + WALK_CADENCE_FRESHNESS_MS + 1),
    ).toEqual({
      isWalking: true,
      phase: "grace",
      evaluatedAt: 2_000 + WALK_CADENCE_FRESHNESS_MS + 1,
      graceEndsAt: 2_000 + WALK_CADENCE_FRESHNESS_MS + 30_000,
    });
  });

  it("does not combine cadence observations separated by a stale gap", () => {
    const verifier = new WalkVerifier({ gracePeriodMs: 30_000 });
    verifier.processActivity(activity(["walking"], 0));
    verifier.processCadence({
      stepsPerSecond: 1.7,
      cumulativeSteps: 4,
      asOf: 1_000,
    });

    expect(
      verifier.processCadence({
        stepsPerSecond: 1.7,
        cumulativeSteps: 20,
        asOf: 1_000 + WALK_CADENCE_FRESHNESS_MS + 1,
      }),
    ).toEqual({
      isWalking: false,
      phase: "notWalking",
      evaluatedAt: 1_000 + WALK_CADENCE_FRESHNESS_MS + 1,
    });
  });
});
