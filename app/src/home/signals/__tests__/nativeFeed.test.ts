import { KingstinctHealthKitClient } from "@/signals/health/KingstinctHealthKitClient";
import { ContractKingstinctHealthKitModule } from "@/signals/health/testing/ContractKingstinctHealthKitModule";
import { ContractExcerlockMotionModule } from "@/signals/motion/testing/ContractExcerlockMotionModule";

import { createHealthKitHomeSignalFeed } from "../healthKitFeed";

describe("native Home signal composition", () => {
  it("starts and reads motion through the native provider adapter", async () => {
    const motion = new ContractExcerlockMotionModule();
    const feed = createHealthKitHomeSignalFeed(
      {
        health: new KingstinctHealthKitClient(
          new ContractKingstinctHealthKitModule(),
        ),
        motion,
      },
      { gracePeriodMs: 30_000, now: () => 6_000 },
    );

    await feed.start();
    motion.emitActivity({
      classes: ["walking"],
      confidence: "high",
      startedAt: 1_000,
      receivedAt: 1_000,
    });
    motion.emitCadence({
      stepsPerSecond: 1.7,
      cumulativeSteps: 4,
      asOf: 2_000,
    });
    motion.emitCadence({
      stepsPerSecond: 1.7,
      cumulativeSteps: 7,
      asOf: 4_000,
    });

    expect(motion.startCalls).toBe(1);
    expect((await feed.read()).activeSignals).toEqual(["walking"]);
    feed.dispose();
  });
});
