import type {
  EarnedUnlockPayload,
  HistoryDayPayload,
  ProfilePayload,
  RuleDayPayload,
  RulePayload,
  SyncSnapshot,
  SyncWriteResult,
  UsageDayPayload,
} from "./payload.js";

/**
 * Sync is a backup-and-restore channel (D5), never a source of truth for
 * enforcement. Every write is last-write-wins on the row's own `updatedAt`,
 * decided by the database so two devices racing cannot interleave into a
 * stale result, and every write is scoped to the authenticated user.
 *
 * Every method is an upsert of the rows it is given. Rows the caller does not
 * mention are left alone — a device that has not yet heard about another
 * device's row must never be able to remove it. A deletion is therefore an
 * explicit tombstone (`deletedAt` on the rule), not an absence.
 */
export interface SyncRepository {
  upsertRules(
    userId: string,
    rules: readonly RulePayload[],
  ): Promise<SyncWriteResult>;
  upsertRuleDays(
    userId: string,
    ruleDays: readonly RuleDayPayload[],
  ): Promise<SyncWriteResult>;
  upsertUsageDays(
    userId: string,
    usageDays: readonly UsageDayPayload[],
  ): Promise<SyncWriteResult>;
  upsertEarnedUnlocks(
    userId: string,
    earnedUnlocks: readonly EarnedUnlockPayload[],
  ): Promise<SyncWriteResult>;
  upsertHistoryDays(
    userId: string,
    historyDays: readonly HistoryDayPayload[],
  ): Promise<SyncWriteResult>;
  upsertProfile(
    userId: string,
    profile: ProfilePayload,
  ): Promise<SyncWriteResult>;
  /** Everything this user has, for restore on a new device. */
  read(userId: string): Promise<SyncSnapshot>;
}
