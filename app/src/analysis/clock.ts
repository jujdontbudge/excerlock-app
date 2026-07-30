import { localWallClockNow } from "@/home";

export interface AnalysisClock {
  /** Current local wall-clock milliseconds, matching the ledger's time domain. */
  nowMs(): number;
}

/** The app-route clock. Tests inject a deterministic implementation instead. */
export const systemAnalysisClock: AnalysisClock = {
  nowMs: localWallClockNow,
};
