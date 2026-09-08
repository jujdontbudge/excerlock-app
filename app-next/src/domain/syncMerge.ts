import { HistoryDay } from '../ports/models';
import { RuleTombstone, Stamped, SyncSnapshot } from '../ports/SyncPort';
import { DayKey, EarnedUnlock, Profile, Rule, RuleDay } from './types';

/**
 * The conflict rule for restore (D5, P2-T08). The server keeps the newest `updatedAt` per row; this merge
 * takes a remote row only when the device has none or the remote one is strictly newer than the instant
 * the device last changed its own. Today's rows are device-authoritative and never replaced. The app
 * selection is not part of the payload and stays untouched.
 */

/** Per-row change instants the device recorded for its own day facts; absent means "unknown, keep local". */
export type RowClocks = Record<string, string>;

export const rowKey = {
  ruleDay: (row: Pick<RuleDay, 'ruleId' | 'day'>) => `ruleDay:${row.ruleId}:${row.day}`,
  earnedUnlock: (row: Pick<EarnedUnlock, 'ruleId' | 'day'>) => `earnedUnlock:${row.ruleId}:${row.day}`,
  usageDay: (day: DayKey) => `usageDay:${day}`,
};

export type LocalSyncState = {
  rules: Rule[];
  tombstones: RuleTombstone[];
  ruleDays: RuleDay[];
  earnedUnlocks: EarnedUnlock[];
  history: HistoryDay[];
  profile: Profile;
  profileUpdatedAt: string | null;
  clocks: RowClocks;
};

export type RestoreSummary = {
  rules: number;
  removedRules: number;
  ruleDays: number;
  earnedUnlocks: number;
  usageDays: number;
  profile: boolean;
};

export type MergeResult = {
  rules: Rule[];
  ruleDays: RuleDay[];
  earnedUnlocks: EarnedUnlock[];
  history: HistoryDay[];
  profile: Profile;
  profileUpdatedAt: string | null;
  clocks: RowClocks;
  summary: RestoreSummary;
};

const later = (a: string, b: string) => Date.parse(a) > Date.parse(b);

function mergeRules(local: Rule[], tombstones: RuleTombstone[], remote: SyncSnapshot) {
  const byId = new Map(local.map((rule) => [rule.id, rule]));
  const deletedHere = new Map(tombstones.map((tombstone) => [tombstone.id, tombstone.deletedAt]));
  let rules = 0,
    removedRules = 0;
  for (const rule of remote.rules) {
    const deletedAt = deletedHere.get(rule.id);
    if (deletedAt && !later(rule.updatedAt, deletedAt)) continue;
    const mine = byId.get(rule.id);
    if (mine && !later(rule.updatedAt, mine.updatedAt)) continue;
    byId.set(rule.id, rule);
    rules += 1;
  }
  for (const tombstone of remote.tombstones) {
    const mine = byId.get(tombstone.id);
    if (!mine || !later(tombstone.deletedAt, mine.updatedAt)) continue;
    byId.delete(tombstone.id);
    removedRules += 1;
  }
  return { rules: [...byId.values()], summary: { rules, removedRules } };
}

function mergeRows<T extends { day: DayKey }>(
  local: T[],
  remote: Stamped<T>[],
  key: (row: T) => string,
  clocks: RowClocks,
  today: DayKey,
) {
  const rows = new Map(local.map((row) => [key(row), row]));
  let taken = 0;
  for (const stamped of remote) {
    const { updatedAt, ...row } = stamped;
    const id = key(row as unknown as T);
    const mine = rows.get(id);
    if (mine) {
      if (row.day === today) continue;
      const clock = clocks[id];
      if (!clock || !later(updatedAt, clock)) continue;
    }
    rows.set(id, row as unknown as T);
    clocks[id] = updatedAt;
    taken += 1;
  }
  return { rows: [...rows.values()], taken };
}

/**
 * Sealed history stays on the device (no server table). Locked-app minutes are the one part that travels,
 * and they fill only a history day the device recorded without a measurement.
 */
function mergeUsage(history: HistoryDay[], remote: SyncSnapshot['usageDays'], clocks: RowClocks) {
  const minutes = new Map(remote.map((row) => [row.day, row]));
  let taken = 0;
  const rows = history.map((row) => {
    const usage = minutes.get(row.day);
    if (!usage || row.usageMinutes !== null) return row;
    clocks[rowKey.usageDay(row.day)] = usage.updatedAt;
    taken += 1;
    return { ...row, usageMinutes: usage.lockedAppMinutes };
  });
  return { rows, taken };
}

const isBlankProfile = (profile: Profile) => !profile.name && !profile.referralSource && !profile.mainReason;

function mergeProfile(local: LocalSyncState, remote: SyncSnapshot['profile']) {
  if (!remote) return { profile: local.profile, profileUpdatedAt: local.profileUpdatedAt, taken: false };
  // The warm-up rating never travels; whatever a caller passes, the device's own rating stays.
  const { updatedAt, warmupRating: _ignored, ...profile } = remote;
  const take = local.profileUpdatedAt ? later(updatedAt, local.profileUpdatedAt) : isBlankProfile(local.profile);
  if (!take) return { profile: local.profile, profileUpdatedAt: local.profileUpdatedAt, taken: false };
  return { profile: { ...local.profile, ...profile }, profileUpdatedAt: updatedAt, taken: true };
}

export function mergeSnapshot(local: LocalSyncState, remote: SyncSnapshot, today: DayKey): MergeResult {
  const clocks = { ...local.clocks };
  const rules = mergeRules(local.rules, local.tombstones, remote);
  const ruleDays = mergeRows(local.ruleDays, remote.ruleDays, rowKey.ruleDay, clocks, today);
  const earnedUnlocks = mergeRows(local.earnedUnlocks, remote.earnedUnlocks, rowKey.earnedUnlock, clocks, today);
  const history = mergeUsage(local.history, remote.usageDays, clocks);
  const profile = mergeProfile(local, remote.profile);
  return {
    rules: rules.rules,
    ruleDays: ruleDays.rows,
    earnedUnlocks: earnedUnlocks.rows,
    history: history.rows,
    profile: profile.profile,
    profileUpdatedAt: profile.profileUpdatedAt,
    clocks,
    summary: {
      ...rules.summary,
      ruleDays: ruleDays.taken,
      earnedUnlocks: earnedUnlocks.taken,
      usageDays: history.taken,
      profile: profile.taken,
    },
  };
}

export const restoredAnything = (summary: RestoreSummary) =>
  summary.rules + summary.removedRules + summary.ruleDays + summary.earnedUnlocks + summary.usageDays > 0 ||
  summary.profile;
