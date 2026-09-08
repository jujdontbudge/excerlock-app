import { NativeMotionProvider } from "../NativeMotionProvider";
import { ContractExcerlockMotionModule } from "../testing/ContractExcerlockMotionModule";
import { runMotionProviderContract } from "../testing/providerContract";
import { WalkVerifier } from "../WalkVerifier";

runMotionProviderContract("NativeMotionProvider", () => {
  const motionModule = new ContractExcerlockMotionModule();
  const provider = new NativeMotionProvider(motionModule);
  let currentTimeMs = 0;

  return {
    provider,
    advanceBy(milliseconds) {
      currentTimeMs += milliseconds;
      motionModule.advanceTo(currentTimeMs);
    },
    advanceTo(atMs) {
      currentTimeMs = atMs;
      motionModule.advanceTo(currentTimeMs);
    },
    dispose: () => provider.dispose(),
  };
});

describe("NativeMotionProvider WalkVerifier integration", () => {
  it("rejects standing or swaying but accepts indoor or treadmill walking", async () => {
    const motionModule = new ContractExcerlockMotionModule();
    const provider = new NativeMotionProvider(motionModule);
    const verifier = new WalkVerifier({ gracePeriodMs: 30_000 });
    provider.on("activity", (sample) => verifier.processActivity(sample));
    provider.on("cadence", (sample) => verifier.processCadence(sample));
    await provider.start();

    motionModule.emitActivity({
      classes: ["stationary"],
      confidence: "high",
      startedAt: 1_000,
      receivedAt: 1_000,
    });
    motionModule.emitCadence({
      stepsPerSecond: 2,
      cumulativeSteps: 2,
      asOf: 2_000,
    });
    motionModule.emitCadence({
      stepsPerSecond: 2,
      cumulativeSteps: 4,
      asOf: 3_000,
    });

    expect(verifier.getVerdict(3_000)).toMatchObject({
      isWalking: false,
      phase: "notWalking",
    });

    motionModule.emitActivity({
      classes: ["walking"],
      confidence: "high",
      startedAt: 4_000,
      receivedAt: 4_000,
    });
    motionModule.emitCadence({
      stepsPerSecond: 2,
      cumulativeSteps: 6,
      asOf: 5_000,
    });
    motionModule.emitCadence({
      stepsPerSecond: 2,
      cumulativeSteps: 8,
      asOf: 6_000,
    });

    expect(verifier.getVerdict(6_000)).toMatchObject({
      isWalking: true,
      phase: "verified",
    });
    await provider.dispose();
  });
});
