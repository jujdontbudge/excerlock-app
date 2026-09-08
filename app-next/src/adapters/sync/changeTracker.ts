import { addDays } from '../../domain/calendar';
import { rowKey } from '../../domain/syncMerge';
import { DayKey, EarnedUnlock, Profile, Rule, RuleDay } from '../../domain/types';
import { HistoryDay } from '../../ports/models';
import { UsageDay } from '../../ports/SyncPort';
import { SyncState } from './syncStore';

/**
 * Pure bookkeeping between two observations of the device's stores and the outbox. Every changed row is
 * stamped with the instant the change was observed, which is the `updatedAt` the server compares (D5).
 */
export type DeviceFacts = {
  rules: Rule[];
  ruleDays: RuleDay[];
  earnedUnlocks: EarnedUnlock[];
  history: HistoryDay[];
  profile: Profile;
};

export const TOMBSTONE_RETENTION_DAYS = 90;

export const usageDaysOf = (history: HistoryDay[]): UsageDay[] =>
  history.flatMap((row) => (row.usageMinutes === null ? [] : [{ day: row.day, lockedAppMinutes: row.usageMinutes }]));

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

function changedRows<T>(previous: T[], next: T[], key: (row: T) => string): T[] {
  const before = new Map(previous.map((row) => [key(row), row]));
  return next.filter((row) => !same(before.get(key(row)), row));
}

function enqueue<T>(
  outbox: Record<string, T & { updatedAt: string }>,
  clocks: Record<string, string>,
  rows: T[],
  key: (row: T) => string,
  now: string,
) {
  if (!rows.length) return { outbox, clocks };
  const nextOutbox = { ...outbox },
    nextClocks = { ...clocks };
  for (const row of rows) {
    const id = key(row);
    nextOutbox[id] = { ...row, updatedAt: now };
    nextClocks[id] = now;
  }
  return { outbox: nextOutbox, clocks: nextClocks };
}

export function trackChanges(state: SyncState, previous: DeviceFacts, next: DeviceFacts, now: string): SyncState {
  let result = state;
  if (!same(previous.rules, next.rules)) {
    const nextIds = new Set(next.rules.map((rule) => rule.id));
    const removed = previous.rules.filter((rule) => !nextIds.has(rule.id));
    result = {
      ...result,
      rulesDirty: true,
      rulesChangedAt: now,
      deleted: [
        ...result.deleted.filter((entry) => !nextIds.has(entry.rule.id)),
        ...removed.map((rule) => ({ rule, deletedAt: now })),
      ],
      tombstones: [
        ...result.tombstones.filter((entry) => !nextIds.has(entry.id)),
        ...removed.map((rule) => ({ id: rule.id, deletedAt: now })),
      ],
    };
  }
  if (!same(previous.profile, next.profile))
    result = { ...result, profileDirty: true, profileUpdatedAt: now };
  let clocks = result.clocks;
  const ruleDays = enqueue(result.ruleDays, clocks, changedRows(previous.ruleDays, next.ruleDays, rowKey.ruleDay), rowKey.ruleDay, now);
  clocks = ruleDays.clocks;
  const earned = enqueue(
    result.earnedUnlocks,
    clocks,
    changedRows(previous.earnedUnlocks, next.earnedUnlocks, rowKey.earnedUnlock),
    rowKey.earnedUnlock,
    now,
  );
  clocks = earned.clocks;
  const usageKey = (row: UsageDay) => rowKey.usageDay(row.day);
  const usage = enqueue(
    result.usageDays,
    clocks,
    changedRows(usageDaysOf(previous.history), usageDaysOf(next.history), usageKey),
    usageKey,
    now,
  );
  if (result === state && usage.clocks === state.clocks) return state;
  return {
    ...result,
    ruleDays: ruleDays.outbox,
    earnedUnlocks: earned.outbox,
    usageDays: usage.outbox,
    clocks: usage.clocks,
  };
}

/** After a restore for a new identity everything the device holds is owed to the server, at its known clock. */
export function markAllDirty(state: SyncState, facts: DeviceFacts, now: string): SyncState {
  const stamp = <T>(rows: T[], key: (row: T) => string) =>
    Object.fromEntries(rows.map((row) => [key(row), { ...row, updatedAt: state.clocks[key(row)] ?? now }]));
  const usageKey = (row: UsageDay) => rowKey.usageDay(row.day);
  return {
    ...state,
    rulesDirty: true,
    rulesChangedAt: state.rulesChangedAt ?? now,
    profileDirty: true,
    profileUpdatedAt: state.profileUpdatedAt ?? now,
    ruleDays: stamp(facts.ruleDays, rowKey.ruleDay),
    earnedUnlocks: stamp(facts.earnedUnlocks, rowKey.earnedUnlock),
    usageDays: stamp(usageDaysOf(facts.history), usageKey),
  };
}

export const hasDayFacts = (state: SyncState) =>
  Object.keys(state.ruleDays).length + Object.keys(state.earnedUnlocks).length + Object.keys(state.usageDays).length > 0;

export function pruneTombstones(state: SyncState, today: DayKey): SyncState {
  const cutoff = Date.parse(`${addDays(today, -TOMBSTONE_RETENTION_DAYS)}T00:00:00Z`);
  const tombstones = state.tombstones.filter((entry) => Date.parse(entry.deletedAt) >= cutoff);
  return tombstones.length === state.tombstones.length ? state : { ...state, tombstones };
}
