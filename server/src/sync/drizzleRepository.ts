import { desc, eq, sql } from "drizzle-orm";
import type { PgDatabase } from "drizzle-orm/pg-core";
import {
  earnedUnlocks,
  getDb,
  historyDays,
  profiles,
  ruleDays,
  rules,
  usageDays,
  users,
  type DatabaseSchema,
} from "../db/index.js";
import { DeletedIdentityError } from "../identity/index.js";
import {
  SYNC_HISTORY_LIMIT,
  type EarnedUnlockPayload,
  type HistoryDayPayload,
  type ProfilePayload,
  type RuleDayPayload,
  type RulePayload,
  type SyncSnapshot,
  type SyncWriteResult,
  type UsageDayPayload,
} from "./payload.js";
import type { SyncRepository } from "./repository.js";

type SyncDatabase = PgDatabase<any, DatabaseSchema>;
type SyncTransaction = Parameters<
  Parameters<SyncDatabase["transaction"]>[0]
>[0];

function requireDatabase(database: SyncDatabase | null): SyncDatabase {
  if (!database) {
    throw new Error("Sync persistence is not configured; missing DATABASE_URL");
  }
  return database;
}

/**
 * Sync writes provision their own identity row rather than assuming
 * `PUT /v1/user` has already run, and they refuse a deletion tombstone. A
 * deleted account must not be resurrected by a queued batch that was written
 * before the user asked to be erased.
 */
async function lockActiveUser(
  transaction: SyncTransaction,
  userId: string,
): Promise<void> {
  await transaction.insert(users).values({ id: userId }).onConflictDoNothing();

  const [user] = await transaction
    .select({ deletedAt: users.deletedAt })
    .from(users)
    .where(eq(users.id, userId))
    .for("update")
    .limit(1);
  if (!user || user.deletedAt) {
    throw new DeletedIdentityError();
  }
}

function instant(value: string): Date {
  return new Date(value);
}

function optionalInstant(value: string | null | undefined): Date | null {
  return value ? new Date(value) : null;
}

function iso(value: Date): string {
  return value.toISOString();
}

function optionalIso(value: Date | null): string | null {
  return value ? value.toISOString() : null;
}

/** `numeric` round-trips as a string through the driver; the wire uses numbers. */
function progressOut(value: string): number {
  return Number(value);
}

function tally(total: number, applied: number): SyncWriteResult {
  return { applied, skipped: total - applied };
}

export function createDrizzleSyncRepository(
  configuredDatabase: SyncDatabase | null = getDb(),
): SyncRepository {
  const database = requireDatabase(configuredDatabase);

  return {
    async upsertRules(userId, incoming) {
      if (incoming.length === 0) {
        return tally(0, 0);
      }

      return database.transaction(async (transaction) => {
        await lockActiveUser(transaction, userId);

        const applied = await transaction
          .insert(rules)
          .values(
            incoming.map((rule) => ({
              id: rule.id,
              userId,
              activity: rule.activity,
              mode: rule.mode,
              schedule: rule.schedule,
              enabled: rule.enabled,
              createdAt: instant(rule.createdAt),
              updatedAt: instant(rule.updatedAt),
              deletedAt: optionalInstant(rule.deletedAt),
            })),
          )
          .onConflictDoUpdate({
            target: rules.id,
            set: {
              activity: sql`excluded.activity`,
              mode: sql`excluded.mode`,
              schedule: sql`excluded.schedule`,
              enabled: sql`excluded.enabled`,
              createdAt: sql`excluded.created_at`,
              updatedAt: sql`excluded.updated_at`,
              deletedAt: sql`excluded.deleted_at`,
            },
            // Ownership and last-write-wins in one predicate: a rule id that
            // belongs to another account can never be updated here, and a
            // stale replay can never overwrite a newer row.
            setWhere: sql`${rules.userId} = ${userId} and ${rules.updatedAt} < excluded.updated_at`,
          })
          .returning({ id: rules.id });

        return tally(incoming.length, applied.length);
      });
    },

    async upsertRuleDays(userId, incoming) {
      if (incoming.length === 0) {
        return tally(0, 0);
      }

      return database.transaction(async (transaction) => {
        await lockActiveUser(transaction, userId);

        const applied = await transaction
          .insert(ruleDays)
          .values(
            incoming.map((day) => ({
              userId,
              ruleId: day.ruleId,
              day: day.day,
              progress: String(day.progress),
              met: day.met,
              metAt: optionalInstant(day.metAt),
              unit: day.unit ?? null,
              updatedAt: instant(day.updatedAt),
            })),
          )
          .onConflictDoUpdate({
            target: [ruleDays.userId, ruleDays.ruleId, ruleDays.day],
            set: {
              progress: sql`excluded.progress`,
              met: sql`excluded.met`,
              metAt: sql`excluded.met_at`,
              unit: sql`excluded.unit`,
              updatedAt: sql`excluded.updated_at`,
            },
            setWhere: sql`${ruleDays.updatedAt} < excluded.updated_at`,
          })
          .returning({ day: ruleDays.day });

        return tally(incoming.length, applied.length);
      });
    },

    async upsertUsageDays(userId, incoming) {
      if (incoming.length === 0) {
        return tally(0, 0);
      }

      return database.transaction(async (transaction) => {
        await lockActiveUser(transaction, userId);

        const applied = await transaction
          .insert(usageDays)
          .values(
            incoming.map((day) => ({
              userId,
              day: day.day,
              lockedAppMinutes: day.lockedAppMinutes,
              updatedAt: instant(day.updatedAt),
            })),
          )
          .onConflictDoUpdate({
            target: [usageDays.userId, usageDays.day],
            set: {
              lockedAppMinutes: sql`excluded.locked_app_minutes`,
              updatedAt: sql`excluded.updated_at`,
            },
            setWhere: sql`${usageDays.updatedAt} < excluded.updated_at`,
          })
          .returning({ day: usageDays.day });

        return tally(incoming.length, applied.length);
      });
    },

    async upsertEarnedUnlocks(userId, incoming) {
      if (incoming.length === 0) {
        return tally(0, 0);
      }

      return database.transaction(async (transaction) => {
        await lockActiveUser(transaction, userId);

        const applied = await transaction
          .insert(earnedUnlocks)
          .values(
            incoming.map((unlock) => ({
              userId,
              day: unlock.day,
              ruleId: unlock.ruleId,
              ruleName: unlock.ruleName,
              metAt: instant(unlock.metAt),
              windowEnd: instant(unlock.windowEnd),
              updatedAt: instant(unlock.updatedAt),
            })),
          )
          .onConflictDoUpdate({
            target: [
              earnedUnlocks.userId,
              earnedUnlocks.day,
              earnedUnlocks.ruleId,
            ],
            set: {
              ruleName: sql`excluded.rule_name`,
              metAt: sql`excluded.met_at`,
              windowEnd: sql`excluded.window_end`,
              updatedAt: sql`excluded.updated_at`,
            },
            setWhere: sql`${earnedUnlocks.updatedAt} < excluded.updated_at`,
          })
          .returning({ day: earnedUnlocks.day });

        return tally(incoming.length, applied.length);
      });
    },

    async upsertHistoryDays(userId, incoming) {
      if (incoming.length === 0) {
        return tally(0, 0);
      }

      return database.transaction(async (transaction) => {
        await lockActiveUser(transaction, userId);

        const applied = await transaction
          .insert(historyDays)
          .values(
            incoming.map((day) => ({
              userId,
              day: day.day,
              usageMinutes: day.usageMinutes ?? null,
              activity: day.activity,
              met: day.met,
              scheduled: day.scheduled,
              sealedAt: instant(day.sealedAt),
              updatedAt: instant(day.updatedAt),
            })),
          )
          .onConflictDoUpdate({
            target: [historyDays.userId, historyDays.day],
            set: {
              usageMinutes: sql`excluded.usage_minutes`,
              activity: sql`excluded.activity`,
              met: sql`excluded.met`,
              scheduled: sql`excluded.scheduled`,
              sealedAt: sql`excluded.sealed_at`,
              updatedAt: sql`excluded.updated_at`,
            },
            setWhere: sql`${historyDays.updatedAt} < excluded.updated_at`,
          })
          .returning({ day: historyDays.day });

        return tally(incoming.length, applied.length);
      });
    },

    async upsertProfile(userId, profile) {
      return database.transaction(async (transaction) => {
        await lockActiveUser(transaction, userId);

        const applied = await transaction
          .insert(profiles)
          .values({
            userId,
            name: profile.name ?? null,
            referralSource: profile.referralSource ?? null,
            ageBand: profile.ageBand ?? null,
            occupation: profile.occupation ?? null,
            improveFirst: profile.improveFirst ?? null,
            mainReason: profile.mainReason ?? null,
            estimatedDailyMinutes: profile.estimatedDailyMinutes ?? null,
            units: profile.units ?? null,
            updatedAt: instant(profile.updatedAt),
          })
          .onConflictDoUpdate({
            target: profiles.userId,
            set: {
              name: sql`excluded.name`,
              referralSource: sql`excluded.referral_source`,
              ageBand: sql`excluded.age_band`,
              occupation: sql`excluded.occupation`,
              improveFirst: sql`excluded.improve_first`,
              mainReason: sql`excluded.main_reason`,
              estimatedDailyMinutes: sql`excluded.estimated_daily_minutes`,
              units: sql`excluded.units`,
              updatedAt: sql`excluded.updated_at`,
            },
            setWhere: sql`${profiles.updatedAt} < excluded.updated_at`,
          })
          .returning({ userId: profiles.userId });

        return tally(1, applied.length);
      });
    },

    async read(userId) {
      const [
        ruleRows,
        ruleDayRows,
        usageDayRows,
        earnedUnlockRows,
        historyDayRows,
        profileRows,
      ] = await Promise.all([
          database
            .select()
            .from(rules)
            .where(eq(rules.userId, userId))
            .orderBy(desc(rules.updatedAt), rules.id),
          database
            .select()
            .from(ruleDays)
            .where(eq(ruleDays.userId, userId))
            .orderBy(desc(ruleDays.day), ruleDays.ruleId)
            .limit(SYNC_HISTORY_LIMIT),
          database
            .select()
            .from(usageDays)
            .where(eq(usageDays.userId, userId))
            .orderBy(desc(usageDays.day))
            .limit(SYNC_HISTORY_LIMIT),
          database
            .select()
            .from(earnedUnlocks)
            .where(eq(earnedUnlocks.userId, userId))
            .orderBy(desc(earnedUnlocks.day), earnedUnlocks.ruleId)
            .limit(SYNC_HISTORY_LIMIT),
          database
            .select()
            .from(historyDays)
            .where(eq(historyDays.userId, userId))
            .orderBy(desc(historyDays.day))
            .limit(SYNC_HISTORY_LIMIT),
          database
            .select()
            .from(profiles)
            .where(eq(profiles.userId, userId))
            .limit(1),
        ]);

      const profile = profileRows[0];

      return {
        rules: ruleRows.map((rule) => ({
          id: rule.id,
          activity: rule.activity,
          mode: rule.mode,
          schedule: rule.schedule,
          enabled: rule.enabled,
          createdAt: iso(rule.createdAt),
          updatedAt: iso(rule.updatedAt),
          deletedAt: optionalIso(rule.deletedAt),
        })) as SyncSnapshot["rules"],
        ruleDays: ruleDayRows.map((day) => ({
          ruleId: day.ruleId,
          day: day.day,
          progress: progressOut(day.progress),
          met: day.met,
          metAt: optionalIso(day.metAt),
          unit: day.unit as RuleDayPayload["unit"],
          updatedAt: iso(day.updatedAt),
        })),
        usageDays: usageDayRows.map((day) => ({
          day: day.day,
          lockedAppMinutes: day.lockedAppMinutes,
          updatedAt: iso(day.updatedAt),
        })),
        earnedUnlocks: earnedUnlockRows.map((unlock) => ({
          day: unlock.day,
          ruleId: unlock.ruleId,
          ruleName: unlock.ruleName,
          metAt: iso(unlock.metAt),
          windowEnd: iso(unlock.windowEnd),
          updatedAt: iso(unlock.updatedAt),
        })),
        historyDays: historyDayRows.map((day) => ({
          day: day.day,
          usageMinutes: day.usageMinutes,
          activity: day.activity as HistoryDayPayload["activity"],
          met: day.met,
          scheduled: day.scheduled,
          sealedAt: iso(day.sealedAt),
          updatedAt: iso(day.updatedAt),
        })),
        profile: profile
          ? {
              name: profile.name,
              referralSource: profile.referralSource,
              ageBand: profile.ageBand,
              occupation: profile.occupation,
              improveFirst:
                profile.improveFirst as ProfilePayload["improveFirst"],
              mainReason: profile.mainReason,
              estimatedDailyMinutes: profile.estimatedDailyMinutes,
              units: profile.units as ProfilePayload["units"],
              updatedAt: iso(profile.updatedAt),
            }
          : null,
      };
    },
  };
}
