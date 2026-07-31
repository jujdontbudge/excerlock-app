import {
  FixtureHealthProvider,
  FixtureMotionProvider,
  getSignalFixture,
  type HealthFixtureManifest,
  type MotionFixtureManifest,
  type TimelinePlayback,
} from "@/signals";

import { createHomeSignalFeed, type HomeSignalFeed } from "./homeSignalFeed";

/**
 * The Phase-2 composition root for Home's signals: SignalKit's fixture
 * providers, played back in real time. Phase 3 swaps these two constructors for
 * the native providers and nothing else on Home changes.
 */
export const HOME_FIXTURE_SCENARIO = {
  health: "day-steps-approaching-5k",
  motion: "steady-walk",
} as const;

export function createFixtureHomeSignalFeed(
  playback: TimelinePlayback = { mode: "auto", speed: 1 },
): HomeSignalFeed {
  const health = new FixtureHealthProvider(
    getSignalFixture("health", HOME_FIXTURE_SCENARIO.health) as HealthFixtureManifest,
    playback,
  );
  const motion = new FixtureMotionProvider(
    getSignalFixture("motion", HOME_FIXTURE_SCENARIO.motion) as MotionFixtureManifest,
    playback,
  );
  const feed = createHomeSignalFeed({
    health,
    motion,
    walking: {
      gracePeriodMs: 30_000,
      now: () => motion.currentTimeMs,
    },
  });

  return {
    ...feed,
    dispose() {
      feed.dispose();
      health.dispose();
      motion.dispose();
    },
  };
}
