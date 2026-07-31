import { localWallClockNow } from "@/home";

export type LockAppRuntime = Readonly<{
  now: () => number;
}>;

let appRuntime: LockAppRuntime | undefined;

/** The composition root's clock for every Lock policy and status decision. */
export function getLockAppRuntime(): LockAppRuntime {
  appRuntime ??= { now: localWallClockNow };
  return appRuntime;
}

/** Stable function for long-lived controllers across runtime replacements. */
export function lockAppNow(): number {
  return getLockAppRuntime().now();
}

/** Installs a build-selected clock before a Lock surface mounts. */
export function installLockAppRuntime(
  runtime: LockAppRuntime,
): () => void {
  const previous = appRuntime;
  appRuntime = runtime;

  return () => {
    if (appRuntime === runtime) {
      appRuntime = previous;
    }
  };
}
