import { useSyncExternalStore } from "react";

import { useMilestoneUnlockStore } from "./unlockStore";

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

/** Shared gate for every behavior that must see persisted unlock records. */
export function useMilestoneUnlockHydration(): boolean {
  return useSyncExternalStore(
    subscribeToHydration,
    getHydrationSnapshot,
    () => false,
  );
}
