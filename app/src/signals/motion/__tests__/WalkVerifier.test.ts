import {
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
      isWalking: true,
      phase: "verified",
      evaluatedAt: 2_000,
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

    verifier.processActivity(activity(["walking"], 36_000));
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
});
