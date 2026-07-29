import type { Journal } from "@excerlock/ledger";

import { localWallClockNow, useHomeStore } from "@/home";

/**
 * The Phase-2 wiring seam, kept to one file so the coupling is visible.
 *
 * The desired shield state is a ledger answer, and the ledger needs the journal
 * the user's earns land in — which Home owns today. Lock reads it and writes
 * nothing back. When the allowance picker lands in Manage (PRD §3.15, tab 2),
 * `baseAllowanceMinutes` gets one owner and this file becomes its reader too.
 */
export function homeJournal(): Journal {
  return useHomeStore.getState().journal;
}

export function localNow(): number {
  return localWallClockNow();
}
