import { useCallback, useEffect, useSyncExternalStore } from "react";

import type { LockController, LockSnapshot } from "../controller/lockController";

/**
 * Binds a mounted screen to the controller: it starts the boundary
 * subscription on mount, drops it on unmount, and re-renders on every snapshot.
 */
export function useLockSnapshot(controller: LockController): LockSnapshot {
  const snapshot = useSyncExternalStore(
    useCallback((onChange) => controller.subscribe(onChange), [controller]),
    useCallback(() => controller.getSnapshot(), [controller]),
  );

  useEffect(() => {
    void controller.start();
    return () => controller.stop();
  }, [controller]);

  return snapshot;
}
