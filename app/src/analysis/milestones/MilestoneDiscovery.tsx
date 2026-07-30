import { useEffect, useMemo, useSyncExternalStore } from "react";

import {
  buildMilestoneRows,
  unlockedMilestoneIds,
  type MilestoneMetrics,
} from "./progress";
import { useMilestoneUnlockStore } from "./unlockStore";

type MilestoneDiscoveryProps = Readonly<{
  metrics: MilestoneMetrics;
  /** Supplied by the live-data boundary so discovery never owns a clock. */
  unlockedAtMs: number;
}>;

function subscribeToHydration(onStoreChange: () => void): () => void {
  const unsubscribeHydrate =
    useMilestoneUnlockStore.persist.onHydrate(onStoreChange);
  const unsubscribeFinish =
    useMilestoneUnlockStore.persist.onFinishHydration(onStoreChange);

  return () => {
    unsubscribeHydrate();
    unsubscribeFinish();
  };
}

function getHydrationSnapshot(): boolean {
  return useMilestoneUnlockStore.persist.hasHydrated();
}

/**
 * Records achievements only after persisted state is known, preventing a
 * relaunch from briefly rediscovering and re-announcing an existing badge.
 */
export function MilestoneDiscovery({
  metrics,
  unlockedAtMs,
}: MilestoneDiscoveryProps) {
  const isHydrated = useSyncExternalStore(
    subscribeToHydration,
    getHydrationSnapshot,
    () => false,
  );
  const discoverUnlocks = useMilestoneUnlockStore(
    (state) => state.discoverUnlocks,
  );
  const achievedIds = useMemo(
    () => unlockedMilestoneIds(buildMilestoneRows(metrics)),
    [
      metrics.activityCount,
      metrics.currentStreakDays,
      metrics.longestStreakDays,
      metrics.timeReclaimedMinutes,
    ],
  );

  useEffect(() => {
    if (!isHydrated) return;
    discoverUnlocks(achievedIds, unlockedAtMs);
  }, [
    achievedIds,
    discoverUnlocks,
    isHydrated,
    unlockedAtMs,
  ]);

  return null;
}
