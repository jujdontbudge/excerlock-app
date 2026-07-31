import { SystemScreenTimeClock, type ScreenTimeClock } from "./clock";

export type ScreenTimeAppRuntime = Readonly<{
  clock: ScreenTimeClock;
}>;

let appRuntime: ScreenTimeAppRuntime | undefined;

/** The composition root's clock for Screen Time boundary decisions. */
export function getScreenTimeAppRuntime(): ScreenTimeAppRuntime {
  appRuntime ??= { clock: new SystemScreenTimeClock() };
  return appRuntime;
}

/**
 * Stable clock indirection for the app-lifetime adapter. Scenario selection can
 * replace the runtime after the Screen Time singleton has been constructed.
 */
export const screenTimeAppClock: ScreenTimeClock = Object.freeze({
  nowMs: () => getScreenTimeAppRuntime().clock.nowMs(),
  scheduleAt: (atMs: number, callback: () => void) =>
    getScreenTimeAppRuntime().clock.scheduleAt(atMs, callback),
});

/** Installs a build-selected clock before a Screen Time surface mounts. */
export function installScreenTimeAppRuntime(
  runtime: ScreenTimeAppRuntime,
): () => void {
  const previous = appRuntime;
  appRuntime = runtime;

  return () => {
    if (appRuntime === runtime) {
      appRuntime = previous;
    }
  };
}
