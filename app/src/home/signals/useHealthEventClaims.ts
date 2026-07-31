import { useEffect } from "react";

import type { SignalReading } from "../model/reading";
import { useHomeStore } from "../store/homeStore";

/** Sends Health snapshots through ConditionEngine and the ledger-owning store. */
export function useHealthEventClaims(
  reading: SignalReading,
  atMs: number,
): void {
  const claimHealthEvents = useHomeStore((state) => state.claimHealthEvents);

  useEffect(() => {
    claimHealthEvents(reading, atMs);
  }, [atMs, claimHealthEvents, reading]);
}
