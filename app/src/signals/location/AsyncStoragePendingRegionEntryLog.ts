import AsyncStorage from "@react-native-async-storage/async-storage";

import type {
  PendingRegionEntry,
  PendingRegionEntryLog,
} from "./PendingRegionEntryLog";

export const PENDING_REGION_ENTRY_STORAGE_KEY =
  "@excerlock/location/pending-region-enters/v1";

type Mutation<TResult> = (entries: readonly PendingRegionEntry[]) => {
  readonly entries: readonly PendingRegionEntry[];
  readonly result: TResult;
};

/**
 * On-device home for open dwells. Every read-modify-write runs one at a time,
 * so a background wake and a foreground claim cannot both take the same enter.
 */
export class AsyncStoragePendingRegionEntryLog implements PendingRegionEntryLog {
  private queue: Promise<unknown> = Promise.resolve();

  public record(entry: PendingRegionEntry): Promise<void> {
    const opened: PendingRegionEntry = {
      regionId: entry.regionId,
      atMs: entry.atMs,
    };
    return this.mutate((entries) => ({
      entries: entries.some(({ regionId }) => regionId === opened.regionId)
        ? entries
        : [...entries, opened],
      result: undefined,
    }));
  }

  public take(regionId: string): Promise<PendingRegionEntry | null> {
    return this.mutate((entries) => ({
      entries: entries.filter((entry) => entry.regionId !== regionId),
      result: entries.find((entry) => entry.regionId === regionId) ?? null,
    }));
  }

  public takeElapsed(
    nowMs: number,
    dwellMs: number,
  ): Promise<readonly PendingRegionEntry[]> {
    const elapsed = (entry: PendingRegionEntry): boolean =>
      nowMs - entry.atMs >= dwellMs;
    return this.mutate((entries) => ({
      entries: entries.filter((entry) => !elapsed(entry)),
      result: entries.filter(elapsed),
    }));
  }

  public readAll(): Promise<readonly PendingRegionEntry[]> {
    return this.enqueue(() => readStoredEntries());
  }

  private mutate<TResult>(apply: Mutation<TResult>): Promise<TResult> {
    return this.enqueue(async () => {
      const { entries, result } = apply(await readStoredEntries());
      await AsyncStorage.setItem(
        PENDING_REGION_ENTRY_STORAGE_KEY,
        JSON.stringify(entries),
      );
      return result;
    });
  }

  private enqueue<TResult>(step: () => Promise<TResult>): Promise<TResult> {
    const next = this.queue.then(step);
    this.queue = next.catch(() => undefined);
    return next;
  }
}

async function readStoredEntries(): Promise<readonly PendingRegionEntry[]> {
  const stored = await AsyncStorage.getItem(PENDING_REGION_ENTRY_STORAGE_KEY);
  if (stored === null) {
    return [];
  }
  try {
    const value: unknown = JSON.parse(stored);
    return Array.isArray(value) ? value.filter(isPendingRegionEntry) : [];
  } catch {
    return [];
  }
}

function isPendingRegionEntry(value: unknown): value is PendingRegionEntry {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const candidate = value as Partial<PendingRegionEntry>;
  return (
    typeof candidate.regionId === "string" &&
    typeof candidate.atMs === "number" &&
    Number.isFinite(candidate.atMs)
  );
}
