import { and, eq, sql } from "drizzle-orm";
import type { PgDatabase } from "drizzle-orm/pg-core";
import { adaptySubscriptionStates, adaptyWebhookEvents, getDb, users, type DatabaseSchema } from "../db/index.js";
import type { AdaptyWebhookRepository, EnvironmentObservation } from "./repository.js";
type SubscriptionDatabase = PgDatabase<any, DatabaseSchema>;
function requireDatabase(database: SubscriptionDatabase | null): SubscriptionDatabase { if (!database) throw new Error("Adapty webhook persistence is not configured; missing DATABASE_URL"); return database; }
function rowToObservation(row: typeof adaptySubscriptionStates.$inferSelect): EnvironmentObservation { return { environment: row.environment, status: row.status as EnvironmentObservation["status"], hasAccess: row.hasAccess, expiresAt: row.expiresAt, isInGracePeriod: row.isInGracePeriod, observedAt: row.eventOccurredAt, source: row.source as EnvironmentObservation["source"], syncState: row.syncState as EnvironmentObservation["syncState"] }; }
export function createDrizzleAdaptyWebhookRepository(configuredDatabase: SubscriptionDatabase | null = getDb()): AdaptyWebhookRepository {
  const database = requireDatabase(configuredDatabase);
  async function upsert(transaction: SubscriptionDatabase, userId: string, observation: EnvironmentObservation, eventType: string, orderingKey: string, updatedAt: Date): Promise<boolean> {
    const [written] = await transaction.insert(adaptySubscriptionStates).values({ userId, environment: observation.environment, hasAccess: observation.hasAccess, eventType, eventOccurredAt: observation.observedAt, expiresAt: observation.expiresAt, updatedAt, status: observation.status, isInGracePeriod: observation.isInGracePeriod, source: observation.source, syncState: observation.syncState, lastDeliveryKey: orderingKey }).onConflictDoUpdate({
      target: [adaptySubscriptionStates.userId, adaptySubscriptionStates.environment],
      set: { hasAccess: observation.hasAccess, eventType, eventOccurredAt: observation.observedAt, expiresAt: observation.expiresAt, updatedAt, status: observation.status, isInGracePeriod: observation.isInGracePeriod, source: observation.source, syncState: observation.syncState, lastDeliveryKey: orderingKey },
      setWhere: sql`${adaptySubscriptionStates.eventOccurredAt} < ${observation.observedAt} OR (${adaptySubscriptionStates.eventOccurredAt} = ${observation.observedAt} AND ${adaptySubscriptionStates.lastDeliveryKey} < ${orderingKey})`,
    }).returning({ userId: adaptySubscriptionStates.userId });
    return Boolean(written);
  }
  return {
    async record(event, receivedAt) { return database.transaction(async (transaction) => {
      const [user] = await transaction.select({ id: users.id, deletedAt: users.deletedAt }).from(users).where(eq(users.id, event.customerUserId)).for("update").limit(1);
      const [inserted] = await transaction.insert(adaptyWebhookEvents).values({ deliveryKey: event.deliveryKey, userId: user && !user.deletedAt ? user.id : null, eventType: event.eventType, environment: event.environment, receivedAt }).onConflictDoNothing().returning({ deliveryKey: adaptyWebhookEvents.deliveryKey });
      if (!inserted) return { recorded: false };
      if (user && !user.deletedAt) await upsert(transaction, user.id, event, event.eventType, event.deliveryKey, receivedAt);
      return { recorded: true };
    }); },
    async writeObservation(userId, observation, orderingKey) { return database.transaction(async (transaction) => {
      const [user] = await transaction.select({ deletedAt: users.deletedAt }).from(users).where(eq(users.id, userId)).for("update").limit(1);
      if (!user || user.deletedAt) return false;
      return upsert(transaction, userId, observation, "profile_resync", orderingKey, observation.observedAt);
    }); },
    async readSubscriptionState(userId, environment) { const [row] = await database.select().from(adaptySubscriptionStates).where(and(eq(adaptySubscriptionStates.userId, userId), eq(adaptySubscriptionStates.environment, environment))).limit(1); return row ? rowToObservation(row) : null; },
  };
}
