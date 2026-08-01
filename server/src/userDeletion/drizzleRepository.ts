import { eq, isNull, sql } from "drizzle-orm";
import type { PgDatabase } from "drizzle-orm/pg-core";
import {
  featureRequestVotes,
  getDb,
  supportRequests,
  users,
  vendorConnections,
  vendorOAuthStates,
  vendorWebhookEvents,
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
  clerkDeletedAt: users.clerkDeletedAt,
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
          .delete(featureRequestVotes)
          .where(eq(featureRequestVotes.userId, userId));
        await transaction
          .delete(supportRequests)
          .where(eq(supportRequests.userId, userId));
        await transaction
          .delete(vendorOAuthStates)
          .where(eq(vendorOAuthStates.userId, userId));
        await transaction
          .delete(vendorConnections)
          .where(eq(vendorConnections.userId, userId));
        await transaction
          .update(vendorWebhookEvents)
          .set({ externalUserId: "deleted", rawPayload: "{}" })
          .where(eq(vendorWebhookEvents.userId, userId));

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

    async markClerkDeleted(userId, deletedAt) {
      await database
        .update(users)
        .set({ clerkDeletedAt: deletedAt })
        .where(eq(users.id, userId));
    },
  };
}
