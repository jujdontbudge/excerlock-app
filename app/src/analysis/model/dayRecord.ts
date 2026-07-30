import {
  daySummaries,
  type DaySummary,
  type Journal,
  type LedgerConfig,
} from "@excerlock/ledger";

/**
 * Projects Home's append-only journal into Analysis's read model.
 *
 * Analysis owns no clock. Its caller may supply the local-wall-clock instant to
 * include gap days through today. When the composition root does not supply
 * one, the latest journal event is the honest deterministic cutoff: no
 * unrecorded future day is invented.
 */
export function deriveDayRecord(
  journal: Journal,
  ledgerConfig: LedgerConfig,
  throughMs?: number,
): DaySummary[] {
  const cutoff = throughMs ?? latestEntryMs(journal);
  if (
    cutoff === undefined ||
    !journal.entries.some((entry) => entry.atMs <= cutoff)
  ) {
    return [];
  }

  return daySummaries(journal, ledgerConfig, cutoff);
}

function latestEntryMs(journal: Journal): number | undefined {
  return journal.entries.reduce<number | undefined>(
    (latest, entry) =>
      latest === undefined ? entry.atMs : Math.max(latest, entry.atMs),
    undefined,
  );
}
