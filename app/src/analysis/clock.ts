import { localWallClockNow } from "@/home";

export interface AnalysisClock {
  /** Current local wall-clock milliseconds, matching the ledger's time domain. */
  nowMs(): number;
}

/** The app-route clock. Tests inject a deterministic implementation instead. */
export const systemAnalysisClock: AnalysisClock = {
  nowMs: localWallClockNow,
};

let analysisClock: AnalysisClock = systemAnalysisClock;

/** The route reads through this so a scenario can own "today". */
export function getAnalysisClock(): AnalysisClock {
  return analysisClock;
}

/**
 * Scenario-owned override, mirroring the other fixture installs. Without it
 * the heat map and period breakdowns anchor to the machine's real date, which
 * silently diverges from a replayed journal once the calendar rolls past the
 * scenario day (observed 2026-08-04: a 29 Jul scenario read "this month" as
 * August and showed no earnings).
 */
export function installAnalysisClock(clock: AnalysisClock): () => void {
  const previous = analysisClock;
  analysisClock = clock;
  return () => {
    if (analysisClock === clock) {
      analysisClock = previous;
    }
  };
}
