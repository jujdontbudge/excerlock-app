import { localWallClockNow } from "../model/clock";
import {
  createFixtureHomeSignalFeed,
} from "./fixtureFeed";
import type { HomeSignalFeed } from "./homeSignalFeed";

export type HomeAppRuntime = Readonly<{
  feed: HomeSignalFeed;
  now: () => number;
}>;

let appRuntime: HomeAppRuntime | undefined;

/** The composition root's one Home runtime for the lifetime of the app. */
export function getHomeAppRuntime(): HomeAppRuntime {
  appRuntime ??= {
    feed: createFixtureHomeSignalFeed(),
    now: localWallClockNow,
  };
  return appRuntime;
}

/**
 * Installs a build-selected runtime before Home mounts. Screens consume the
 * ordinary feed/clock interface and never read a build flag.
 */
export function installHomeAppRuntime(
  runtime: HomeAppRuntime,
): () => void {
  const previous = appRuntime;
  appRuntime = runtime;

  return () => {
    if (appRuntime !== runtime) {
      return;
    }
    runtime.feed.dispose();
    appRuntime = previous;
  };
}
