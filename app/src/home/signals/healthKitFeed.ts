import {
  FixtureMotionProvider,
  getSignalFixture,
  type MotionFixtureManifest,
  type TimelinePlayback,
} from "@/signals";
import { HealthKitHealthProvider } from "@/signals/health/HealthKitHealthProvider";
import { createKingstinctHealthKitClient } from "@/signals/health/KingstinctHealthKitClient";

import { HOME_FIXTURE_SCENARIO } from "./fixtureFeed";
import { createHomeSignalFeed, type HomeSignalFeed } from "./homeSignalFeed";

/** HealthKit is real in the dev client; motion remains Phase-2 until its native lane lands. */
export function createHealthKitHomeSignalFeed(
  playback: TimelinePlayback = { mode: "auto", speed: 1 },
): HomeSignalFeed {
  const health = new HealthKitHealthProvider(createKingstinctHealthKitClient());
  const motion = new FixtureMotionProvider(
    getSignalFixture(
      "motion",
      HOME_FIXTURE_SCENARIO.motion,
    ) as MotionFixtureManifest,
    playback,
  );
  const feed = createHomeSignalFeed({ health, motion });

  return {
    ...feed,
    dispose() {
      feed.dispose();
      health.dispose();
      motion.dispose();
    },
  };
}
