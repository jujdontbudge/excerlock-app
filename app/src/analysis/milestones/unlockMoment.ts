import { useEffect, useRef, useState } from "react";

import type { MilestoneId } from "./catalog";
import type { MilestoneHaptics } from "./MilestoneHaptics";
import { useMilestoneUnlockHydration } from "./unlockHydration";
import { useMilestoneUnlockStore } from "./unlockStore";

/**
 * Claims the pending snapshot once per Analysis visit. Unlocks discovered
 * while the tab stays focused remain pending for the following visit.
 */
export function useMilestoneUnlockMoment(
  visitKey: number | null,
  haptics?: MilestoneHaptics,
): readonly MilestoneId[] {
  const [sequence, setSequence] = useState<readonly MilestoneId[]>([]);
  const isHydrated = useMilestoneUnlockHydration();
  const hapticsRef = useRef(haptics);
  hapticsRef.current = haptics;

  useEffect(() => {
    if (!isHydrated || visitKey === null) return;

    const pending = useMilestoneUnlockStore.getState().claimPending();
    setSequence(pending);
    if (pending.length > 0) {
      void hapticsRef.current?.success();
    }
  }, [isHydrated, visitKey]);

  return sequence;
}

export type { MilestoneHaptics } from "./MilestoneHaptics";
