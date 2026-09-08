import { Profile } from '../../domain/types';
import { SyncPort } from '../../ports/SyncPort';
import { defaultUnits } from '../../state/profileStore';
import { SyncClient, SyncError } from './SyncClient';
import { batchField, fromWire, MAX_BATCH, paths, readPull, toWire } from './wire';

/** Splits a row list into server-sized batches, preserving order. */
export function batches<T>(rows: T[], size = MAX_BATCH): T[][] {
  const result: T[][] = [];
  for (let start = 0; start < rows.length; start += size) result.push(rows.slice(start, start + size));
  return result;
}

export type SyncAdapterOptions = {
  /** Fills a null server column when a profile is restored; defaults to the profile store's blanks. */
  profileDefaults?: Pick<Profile, 'estimatedDailyMinutes' | 'units'>;
};

/**
 * `SyncPort` over `/v1/sync/*`. Row pushes are split at the server's batch limit and sent in order so a
 * partial failure leaves a prefix applied; the host re-queues whatever it did not get an answer for.
 *
 * Invariant: a rule set may only be pushed after this adapter has pulled the server's set once. A push
 * before that is refused (retryable), never sent, so a fresh install can never overwrite or tombstone
 * rules the account already has before merging them.
 */
export function createSyncAdapter(client: SyncClient, options: SyncAdapterOptions = {}): SyncPort {
  const profileDefaults = options.profileDefaults ?? { estimatedDailyMinutes: 180, units: defaultUnits };
  let pulled = false;
  const pushRows = async <T, W>(path: string, rows: T[], encode: (row: T) => W) => {
    for (const batch of batches(rows)) await client.put(path, { [batchField.rows]: batch.map(encode) });
  };
  return {
    pushRules: async (rules, deleted) => {
      if (!pulled) throw new SyncError('ordering', 'Rules cannot be pushed before the first pull');
      await client.put(paths.rules, {
        [batchField.rules]: [...rules.map(toWire.rule), ...deleted.map((entry) => toWire.tombstone(entry.rule, entry.deletedAt))],
      });
    },
    pushRuleDays: (rows) => pushRows(paths.ruleDays, rows, toWire.ruleDay),
    pushUsageDays: (rows) => pushRows(paths.usageDays, rows, toWire.usageDay),
    pushEarnedUnlocks: (rows) => pushRows(paths.earnedUnlocks, rows, toWire.earnedUnlock),
    pushHistory: (rows) => pushRows(paths.history, rows, toWire.historyDay),
    pushProfile: (profile) => client.put(paths.profile, { [batchField.profile]: toWire.profile(profile) }),
    pull: async () => {
      const snapshot = fromWire.snapshot(readPull(await client.get(paths.pull)), profileDefaults);
      pulled = true;
      return snapshot;
    },
  };
}
