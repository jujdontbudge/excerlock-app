import { KingstinctHealthKitClient } from "@/signals/health/KingstinctHealthKitClient";
import { ContractKingstinctHealthKitModule } from "@/signals/health/testing/ContractKingstinctHealthKitModule";
import { ContractExcerlockMotionModule } from "@/signals/motion/testing/ContractExcerlockMotionModule";

import { createHealthKitHomeSignalFeed } from "../healthKitFeed";

describe("native Home signal composition", () => {
  it("starts and reads motion through the native provider adapter", async () => {
    const motion = new ContractExcerlockMotionModule();
    const feed = createHealthKitHomeSignalFeed({
      health: new KingstinctHealthKitClient(
        new ContractKingstinctHealthKitModule(),
      ),
      motion,
    });

    await feed.start();

    expect(motion.startCalls).toBe(1);
    expect((await feed.read()).activeSignals).toEqual(["walking"]);
    feed.dispose();
  });
});
