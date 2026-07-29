import {
  FixtureMotionProvider,
  type MotionFixtureManifest,
} from "..";
import { runMotionProviderContract } from "../testing/providerContract";

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

runMotionProviderContract("FixtureMotionProvider", () => {
  const provider = new FixtureMotionProvider(manifest);
  return {
    provider,
    advanceBy: (milliseconds) => provider.advanceBy(milliseconds),
    advanceTo: (atMs) => provider.advanceTo(atMs),
    dispose: () => provider.dispose(),
  };
});
