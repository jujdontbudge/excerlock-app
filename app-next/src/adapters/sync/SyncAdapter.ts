import { SyncPort } from '../../ports/SyncPort';
import { SyncClient } from './SyncClient';
import { fromWire, MAX_BATCH, paths, readPull, toWire } from './wire';

/** Splits a row list into server-sized batches, preserving order. */
export function batches<T>(rows: T[], size = MAX_BATCH): T[][] {
  const result: T[][] = [];
  for (let start = 0; start < rows.length; start += size) result.push(rows.slice(start, start + size));
  return result;
}

/**
 * `SyncPort` over `/v1/sync/*`. Row pushes are split at the server's batch limit and sent in order so a
 * partial failure leaves a prefix applied; the host re-queues whatever it did not get an answer for.
 */
export function createSyncAdapter(client: SyncClient): SyncPort {
  const pushRows = async <T, W>(path: string, rows: T[], encode: (row: T) => W) => {
    for (const batch of batches(rows)) await client.put(path, { rows: batch.map(encode) });
  };
  return {
    pushRules: (rules, deleted) =>
      client.put(paths.rules, {
        rules: [...rules.map(toWire.rule), ...deleted.map((entry) => toWire.tombstone(entry.rule, entry.deletedAt))],
      }),
    pushRuleDays: (rows) => pushRows(paths.ruleDays, rows, toWire.ruleDay),
    pushUsageDays: (rows) => pushRows(paths.usageDays, rows, toWire.usageDay),
    pushEarnedUnlocks: (rows) => pushRows(paths.earnedUnlocks, rows, toWire.earnedUnlock),
    pushHistory: (rows) => pushRows(paths.history, rows, toWire.historyDay),
    pushProfile: (profile) => client.put(paths.profile, { profile: toWire.profile(profile) }),
    pull: async () => fromWire.snapshot(readPull(await client.get(paths.pull))),
  };
}
