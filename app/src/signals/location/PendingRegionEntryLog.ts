/** A raw region enter whose dwell has neither completed nor been cancelled. */
export interface PendingRegionEntry {
  readonly regionId: string;
  readonly atMs: number;
}

/**
 * Durable, coordinate-free record of open region enters.
 *
 * Every `take` hands an entry to exactly one caller, so whichever path settles
 * first — the matching exit, the foreground dwell timer, or the next claim —
 * is the only one that books the visit.
 */
export interface PendingRegionEntryLog {
  /**
   * Opens a dwell. A region has at most one open enter and keeps the time it
   * was first entered, so a re-delivered enter cannot restart the dwell.
   */
  record(entry: PendingRegionEntry): Promise<void>;
  /** Closes the dwell for one region and returns what it held. */
  take(regionId: string): Promise<PendingRegionEntry | null>;
  /** Closes every dwell that reached `dwellMs` by `nowMs`. */
  takeElapsed(
    nowMs: number,
    dwellMs: number,
  ): Promise<readonly PendingRegionEntry[]>;
  /** Open enters in the order their regions were first entered. */
  readAll(): Promise<readonly PendingRegionEntry[]>;
}
