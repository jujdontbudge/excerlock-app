import { useEffect, useState } from "react";

import type { MilestoneId } from "./catalog";
import type { MilestoneBadge } from "./progress";
import { useMilestoneUnlockStore } from "./unlockStore";

export type MilestoneShareSelection = Readonly<{
  badge: MilestoneBadge;
  unlockedAtMs: number;
}>;

/** Holds an early tap until its persisted unlock timestamp is available. */
export function useMilestoneShareRequest(
  badges: readonly MilestoneBadge[],
) {
  const records = useMilestoneUnlockStore((state) => state.records);
  const markTapped = useMilestoneUnlockStore((state) => state.markTapped);
  const [requestedId, setRequestedId] = useState<MilestoneId | null>(null);
  const [selection, setSelection] =
    useState<MilestoneShareSelection | null>(null);
  const requestedBadge = badges.find(({ id }) => id === requestedId);

  useEffect(() => {
    if (requestedId === null || requestedBadge === undefined) return;
    const record = records[requestedId];
    if (record === undefined) return;

    markTapped(requestedId);
    setSelection({ badge: requestedBadge, unlockedAtMs: record.unlockedAtMs });
    setRequestedId(null);
  }, [markTapped, records, requestedBadge, requestedId]);

  return {
    closeShare: () => setSelection(null),
    records,
    requestShare: setRequestedId,
    selection,
  } as const;
}
