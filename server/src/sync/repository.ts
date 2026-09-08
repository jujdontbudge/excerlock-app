import type {
  EarnedUnlockPayload,
  ProfilePayload,
  RuleDayPayload,
  RulePayload,
  RuleSyncWriteResult,
  SyncSnapshot,
  SyncWriteResult,
  UsageDayPayload,
} from "./payload.js";

/**
 * Sync is a backup-and-restore channel (D5), never a source of truth for
 * enforcement. Every write is last-write-wins on the row's own `updatedAt`,
 * decided by the database so two devices racing cannot interleave into a
 * stale result, and every write is scoped to the authenticated user.
 */
export interface SyncRepository {
  /**
   * Full replacement of the user's rule set: rules in the batch are upserted
   * when newer, and any of the user's rules missing from the batch are
   * tombstoned. Never touches a rule owned by someone else.
   */
  replaceRules(
    userId: string,
    rules: readonly RulePayload[],
  ): Promise<RuleSyncWriteResult>;
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
  upsertProfile(
    userId: string,
    profile: ProfilePayload,
  ): Promise<SyncWriteResult>;
  /** Everything this user has, for restore on a new device. */
  read(userId: string): Promise<SyncSnapshot>;
}
