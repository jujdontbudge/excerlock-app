import { and, eq, isNull, lte, or, sql } from "drizzle-orm";
import type { PgDatabase } from "drizzle-orm/pg-core";
import {
  adaptySubscriptionStates,
  adaptyWebhookEvents,
  featureRequestVotes,
  getDb,
  incidentReports,
  supportRequests,
  users,
  vendorConnections,
  vendorOAuthStates,
  vendorWebhookEvents,
} from "../../db/index.js";
import type { DatabaseSchema } from "../../db/index.js";
import type {
  UserDeletionRepository,
  UserDeletionState,
} from "./repository.js";

type UserDeletionDatabase = PgDatabase<any, DatabaseSchema>;

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
  authProvider: users.authProvider,
  authDeletedAt: users.authDeletedAt,
  deletionAttempts: users.deletionAttempts,
  deletionNextRetryAt: users.deletionNextRetryAt,
};

export function createDrizzleUserDeletionRepository(
  configuredDatabase: UserDeletionDatabase | null = getDb(),
): UserDeletionRepository {
  const database = requireDatabase(configuredDatabase);

  return {
    async prepareDeletion(userId, deletedAt, provider = "supabase") {
      return database.transaction(async (transaction) => {
        await transaction
          .insert(users)
          .values({
            id: userId,
            email: null,
            deletedAt,
            authProvider: provider,
            updatedAt: deletedAt,
          })
          .onConflictDoUpdate({
            target: users.id,
            set: {
              email: null,
              deletedAt: sql`coalesce(${users.deletedAt}, excluded.deleted_at)`,
              authProvider: sql`coalesce(${users.authProvider}, excluded.auth_provider)`,
              updatedAt: sql`coalesce(${users.deletedAt}, excluded.deleted_at)`,
            },
          });

        await transaction
          .delete(featureRequestVotes)
          .where(eq(featureRequestVotes.userId, userId));
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
        await transaction
          .delete(incidentReports)
          .where(eq(incidentReports.userId, userId));
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
        return {
          deletedAt: state.deletedAt,
          adaptyErasedAt: state.adaptyErasedAt,
          posthogErasedAt: state.posthogErasedAt,
          authProvider: state.authProvider,
          authDeletedAt: state.authDeletedAt,
          deletionAttempts: state.deletionAttempts ?? 0,
          deletionNextRetryAt: state.deletionNextRetryAt,
        } satisfies UserDeletionState;
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

    async markAuthDeleted(userId, deletedAt, provider) {
      await database
        .update(users)
        .set({ authDeletedAt: deletedAt, authProvider: provider })
        .where(eq(users.id, userId));
    },

    async listIncompleteDeletions(limit, now = new Date()) {
      const rows = await database
        .select({ id: users.id, attempts: users.deletionAttempts })
        .from(users)
        .where(
          and(
            sql`${users.deletedAt} IS NOT NULL`,
            or(
              isNull(users.adaptyErasedAt),
              isNull(users.posthogErasedAt),
              isNull(users.authDeletedAt),
              sql`${users.authProvider} IS DISTINCT FROM 'supabase'`,
            ),
            or(isNull(users.deletionNextRetryAt), lte(users.deletionNextRetryAt, now)),
            eq(users.authProvider, "supabase"),
            or(
              isNull(users.deletionLeaseExpiresAt),
              lte(users.deletionLeaseExpiresAt, now),
            ),
          ),
        )
        .limit(limit);
      return rows.map((row) => ({ userId: row.id, attempts: row.attempts ?? 0 }));
    },

    async recordDeletionFailure(userId, failedAt, nextRetryAt, sanitizedError, ownerId) {
      await database
        .update(users)
        .set({
          deletionAttempts: sql`coalesce(${users.deletionAttempts}, 0) + 1`,
          deletionNextRetryAt: nextRetryAt,
          deletionLastError: sanitizedError.slice(0, 500),
          deletionLeaseOwner: null,
          deletionLeaseExpiresAt: null,
          updatedAt: failedAt,
        })
        .where(and(eq(users.id, userId), eq(users.deletionLeaseOwner, ownerId)));
    },

    async clearDeletionLease(userId, ownerId) {
      await database
        .update(users)
        .set({ deletionLeaseOwner: null, deletionLeaseExpiresAt: null })
        .where(and(eq(users.id, userId), eq(users.deletionLeaseOwner, ownerId)));
    },

    async claimDeletionLease(userId, ownerId, claimedAt, expiresAt) {
      const claimed = await database
        .update(users)
        .set({ deletionLeaseOwner: ownerId, deletionLeaseExpiresAt: expiresAt })
        .where(
          and(
            eq(users.id, userId),
            sql`${users.deletedAt} IS NOT NULL`,
            eq(users.authProvider, "supabase"),
            or(
              isNull(users.adaptyErasedAt),
              isNull(users.posthogErasedAt),
              isNull(users.authDeletedAt),
              sql`${users.authProvider} IS DISTINCT FROM 'supabase'`,
            ),
            or(isNull(users.deletionNextRetryAt), lte(users.deletionNextRetryAt, claimedAt)),
            or(
              isNull(users.deletionLeaseExpiresAt),
              lte(users.deletionLeaseExpiresAt, claimedAt),
            ),
          ),
        )
        .returning({ id: users.id });
      return claimed.length > 0;
    },
  };
}
