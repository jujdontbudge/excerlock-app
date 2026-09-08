import { eq, sql } from "drizzle-orm";
import type { PgDatabase } from "drizzle-orm/pg-core";
import {
  adaptySubscriptionStates,
  adaptyWebhookEvents,
  earnedUnlocks,
  getDb,
  profiles,
  ruleDays,
  rules,
  supportRequests,
  usageDays,
  users,
} from "../db/index.js";
import type { DatabaseSchema } from "../db/index.js";
import type {
  UserDeletionRepository,
  UserDeletionState,
} from "./repository.js";

type UserDeletionDatabase = PgDatabase<
  any,
  DatabaseSchema
>;

function requireDatabase(
  database: UserDeletionDatabase | null,
): UserDeletionDatabase {
  if (!database) {
    throw new Error(
      "User deletion persistence is not configured; missing DATABASE_URL",
    );
  }
  return database;
}

const stateSelection = {
  deletedAt: users.deletedAt,
  adaptyErasedAt: users.adaptyErasedAt,
  posthogErasedAt: users.posthogErasedAt,
  authDeletedAt: users.authDeletedAt,
};

export function createDrizzleUserDeletionRepository(
  configuredDatabase: UserDeletionDatabase | null = getDb(),
): UserDeletionRepository {
  const database = requireDatabase(configuredDatabase);

  return {
    async prepareDeletion(userId, deletedAt) {
      return database.transaction(async (transaction) => {
        await transaction
          .insert(users)
          .values({
            id: userId,
            email: null,
            deletedAt,
            updatedAt: deletedAt,
          })
          .onConflictDoUpdate({
            target: users.id,
            set: {
              email: null,
              deletedAt: sql`coalesce(${users.deletedAt}, ${deletedAt})`,
              updatedAt: sql`coalesce(${users.deletedAt}, ${deletedAt})`,
            },
          });

        await transaction
          .delete(adaptySubscriptionStates)
          .where(eq(adaptySubscriptionStates.userId, userId));
        await transaction
          .update(adaptyWebhookEvents)
          .set({ userId: null })
          .where(eq(adaptyWebhookEvents.userId, userId));
        await transaction
          .delete(supportRequests)
          .where(eq(supportRequests.userId, userId));
        await transaction.delete(earnedUnlocks).where(eq(earnedUnlocks.userId, userId));
        await transaction.delete(ruleDays).where(eq(ruleDays.userId, userId));
        await transaction.delete(usageDays).where(eq(usageDays.userId, userId));
        await transaction.delete(rules).where(eq(rules.userId, userId));
        await transaction.delete(profiles).where(eq(profiles.userId, userId));

        const [state] = await transaction
          .select(stateSelection)
          .from(users)
          .where(eq(users.id, userId))
          .limit(1);
        if (!state?.deletedAt) {
          throw new Error("Deletion tombstone was not persisted");
        }
        return state as UserDeletionState;
      });
    },

    async markAdaptyErased(userId, erasedAt) {
      await database
        .update(users)
        .set({ adaptyErasedAt: erasedAt })
        .where(eq(users.id, userId));
    },

    async markPosthogErased(userId, erasedAt) {
      await database
        .update(users)
        .set({ posthogErasedAt: erasedAt })
        .where(eq(users.id, userId));
    },

    async markAuthDeleted(userId, deletedAt) {
      await database
        .update(users)
        .set({ authDeletedAt: deletedAt })
        .where(eq(users.id, userId));
    },
  };
}
