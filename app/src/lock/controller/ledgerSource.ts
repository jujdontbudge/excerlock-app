import type { Journal, LedgerConfig } from "@excerlock/ledger";
import type { FiredDrainRung } from "@/screentime";

import {
  isFullLock,
  selectAllowance,
  useHomeStore,
  type AllowanceValues,
} from "@/home";

/**
 * The wiring seam, kept to one file so the coupling is visible.
 *
 * The desired shield state is a ledger answer, and the ledger needs both the
 * journal the user's earns land in and the day's config — Home owns both. Since
 * #53 that includes `baseAllowanceMinutes`: **the allowance has one owner**
 * (`home/model/allowance.ts`) and this module reads it. Nothing under `lock/`
 * keeps a copy; the one write it makes is Full Lock's own transition, which is
 * that same number going to zero and back (PRD §3.2).
 */
export function homeJournal(): Journal {
  return useHomeStore.getState().journal;
}

/**
 * Resolves once the persisted Home state has been rehydrated. Before that,
 * `homeJournal()`/`homeLedgerConfig()` answer with defaults — a journal with
 * no earns and an unlimited allowance — and any shield decision made from
 * them is wrong in both directions (device-smoke Finding 9).
 */
export function homeLedgerHydrated(): Promise<void> {
  const { persist } = useHomeStore;
  if (persist.hasHydrated()) {
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    const unsubscribe = persist.onFinishHydration(() => {
      unsubscribe();
      resolve();
    });
  });
}

export function homeLedgerConfig(): LedgerConfig {
  return useHomeStore.getState().ledgerConfig;
}

export function homeAllowance(): AllowanceValues {
  return selectAllowance(useHomeStore.getState());
}

export function homeFullLock(): boolean {
  return isFullLock(homeAllowance());
}

/** Full Lock's two transitions, run by the owner rather than mirrored here. */
export function setHomeFullLock(on: boolean): void {
  useHomeStore.getState().setFullLock(on);
}

/** OS-reported drain rungs land in the owner's journal, idempotently. */
export function ingestHomeDrainRungs(rungs: readonly FiredDrainRung[]): void {
  useHomeStore.getState().ingestDrainRungs(rungs);
}

/**
 * Tells a running lock controller when the owned journal or ledger config
 * changes. The values stay in Home; this seam exposes only the change signal
 * needed to reconcile the Screen Time boundary immediately.
 */
export function subscribeHomeLedgerInputs(onChange: () => void): () => void {
  return useHomeStore.subscribe((state, previousState) => {
    if (
      state.journal !== previousState.journal ||
      state.ledgerConfig !== previousState.ledgerConfig ||
      state.allowanceBeforeFullLock !== previousState.allowanceBeforeFullLock
    ) {
      onChange();
    }
  });
}

/**
 * The allowance a mounted lock screen renders. Two primitive selectors rather
 * than one object selector: zustand compares snapshots by identity, so a
 * selector that built a value would re-render forever.
 */
export function useHomeAllowance(): AllowanceValues {
  const baseAllowanceMinutes = useHomeStore(
    (state) => state.ledgerConfig.baseAllowanceMinutes,
  );
  const allowanceBeforeFullLock = useHomeStore(
    (state) => state.allowanceBeforeFullLock,
  );
  return { baseAllowanceMinutes, allowanceBeforeFullLock };
}
