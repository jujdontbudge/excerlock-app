import type {
  PendingRegionEntry,
  PendingRegionEntryLog,
} from "../PendingRegionEntryLog";

/** In-memory stand-in for the durable enter log; storage stays out of unit tests. */
export class MemoryPendingRegionEntryLog implements PendingRegionEntryLog {
  private readonly entries = new Map<string, PendingRegionEntry>();

  public async record(entry: PendingRegionEntry): Promise<void> {
    if (this.entries.has(entry.regionId)) {
      return;
    }
    this.entries.set(entry.regionId, {
      regionId: entry.regionId,
      atMs: entry.atMs,
    });
  }

  public async take(regionId: string): Promise<PendingRegionEntry | null> {
    const entry = this.entries.get(regionId);
    if (entry === undefined) {
      return null;
    }
    this.entries.delete(regionId);
    return entry;
  }

  public async takeElapsed(
    nowMs: number,
    dwellMs: number,
  ): Promise<readonly PendingRegionEntry[]> {
    const elapsed = [...this.entries.values()].filter(
      (entry) => nowMs - entry.atMs >= dwellMs,
    );
    elapsed.forEach((entry) => this.entries.delete(entry.regionId));
    return elapsed;
  }

  public async readAll(): Promise<readonly PendingRegionEntry[]> {
    return [...this.entries.values()];
  }
}
