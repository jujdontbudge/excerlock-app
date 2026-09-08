import { EarnedUnlock, RuleDay } from '../../domain/types';
import { RowClocks } from '../../domain/syncMerge';
import { validateRule } from '../../domain/validateRule';
import { DeletedRule, RuleTombstone, SealedHistoryDay, Stamped, UsageDay } from '../../ports/SyncPort';
import { defineStore } from '../../state/createPersistedStore';
import * as v from '../../state/validation';

/**
 * The persisted outbox (`excerlock-next.sync.outbox.v1`): what this device still owes the server, keyed per
 * row so repeated edits coalesce, plus the per-row change clocks the restore merge compares against.
 * Rows here duplicate store data on purpose; the outbox is dropped, never migrated, when it cannot be read.
 */
export type SyncState = {
  /** `${session.kind}:${userId}` the outbox belongs to; a change means restore, then a full push. */
  identity: string | null;
  restored: boolean;
  rulesDirty: boolean;
  rulesChangedAt: string | null;
  profileDirty: boolean;
  profileUpdatedAt: string | null;
  /** Deletions still to report. */
  deleted: DeletedRule[];
  /** Every deletion this device made, kept so a restore cannot resurrect it; pruned after 90 days. */
  tombstones: RuleTombstone[];
  ruleDays: Record<string, Stamped<RuleDay>>;
  usageDays: Record<string, Stamped<UsageDay>>;
  earnedUnlocks: Record<string, Stamped<EarnedUnlock>>;
  history: Record<string, Stamped<SealedHistoryDay>>;
  clocks: RowClocks;
  lastDayFactsPushAt: string | null;
};

export const initialSyncState = (): SyncState => ({
  identity: null,
  restored: false,
  rulesDirty: false,
  rulesChangedAt: null,
  profileDirty: false,
  profileUpdatedAt: null,
  deleted: [],
  tombstones: [],
  ruleDays: {},
  usageDays: {},
  earnedUnlocks: {},
  history: {},
  clocks: {},
  lastDayFactsPushAt: null,
});

const recordOf =
  <T>(check: (value: unknown) => boolean) =>
  (value: unknown): v.ValidationResult<Record<string, T>> => {
    if (!v.object(value)) return { ok: false, dropped: [] };
    const kept: Record<string, T> = {},
      dropped: unknown[] = [];
    for (const [key, row] of Object.entries(value)) {
      if (check(row)) kept[key] = row as T;
      else dropped.push(row);
    }
    return { ok: true, value: kept, dropped };
  };
const stamped = (check: (value: unknown) => boolean) => (value: unknown) =>
  check(value) && v.object(value) && v.iso(value.updatedAt);
const day = (value: unknown) => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
const historyDay = v.shape({
  day,
  usageMinutes: v.nullable(v.number()),
  activity: v.shape({ walking: v.number(), gym: v.number(), running: v.number(), biking: v.number() }),
  met: v.bool,
  scheduled: v.bool,
  sealedAt: v.iso,
});
const rule = (value: unknown) => v.object(value) && validateRule(value).length === 0;

export const syncStore = defineStore<SyncState>({
  name: 'sync.outbox',
  initial: initialSyncState(),
  schemaVersion: 1,
  migrations: { 0: (raw) => raw },
  validators: {
    identity: v.nullable(v.text),
    restored: v.bool,
    rulesDirty: v.bool,
    rulesChangedAt: v.nullable(v.iso),
    profileDirty: v.bool,
    profileUpdatedAt: v.nullable(v.iso),
    deleted: v.arrayOf(v.shape({ rule, deletedAt: v.iso })),
    tombstones: v.arrayOf(v.shape({ id: v.text, deletedAt: v.iso })),
    ruleDays: recordOf(stamped(v.ruleDay)),
    usageDays: recordOf(stamped(v.shape({ day, lockedAppMinutes: v.number() }))),
    earnedUnlocks: recordOf(stamped(v.earnedUnlock)),
    history: recordOf(stamped(historyDay)),
    clocks: recordOf(v.iso),
    lastDayFactsPushAt: v.nullable(v.iso),
  },
});
