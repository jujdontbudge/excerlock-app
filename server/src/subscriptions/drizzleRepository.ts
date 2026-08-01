import { eq, sql } from "drizzle-orm";
import type { PgDatabase } from "drizzle-orm/pg-core";
import {
  adaptySubscriptionStates,
  adaptyWebhookEvents,
  getDb,
  users,
  type DatabaseSchema,
} from "../db/index.js";
import type { AdaptyWebhookRepository } from "./repository.js";

type SubscriptionDatabase = PgDatabase<any, DatabaseSchema>;

function requireDatabase(
  database: SubscriptionDatabase | null,
): SubscriptionDatabase {
  if (!database) {
    throw new Error(
      "Adapty webhook persistence is not configured; missing DATABASE_URL",
    );
  }
  return database;
}

export function createDrizzleAdaptyWebhookRepository(
  configuredDatabase: SubscriptionDatabase | null = getDb(),
): AdaptyWebhookRepository {
  const database = requireDatabase(configuredDatabase);

  return {
    async record(event, receivedAt) {
      return database.transaction(async (transaction) => {
        const [user] = await transaction
          .select({ id: users.id, deletedAt: users.deletedAt })
          .from(users)
          .where(eq(users.id, event.customerUserId))
          .for("update")
          .limit(1);

        const [inserted] = await transaction
          .insert(adaptyWebhookEvents)
          .values({
            deliveryKey: event.deliveryKey,
            userId: user && !user.deletedAt ? user.id : null,
            eventType: event.eventType,
            receivedAt,
          })
          .onConflictDoNothing()
          .returning({ deliveryKey: adaptyWebhookEvents.deliveryKey });

        if (!inserted) {
          return { recorded: false };
        }

        if (user && !user.deletedAt) {
          await transaction
            .insert(adaptySubscriptionStates)
            .values({
              userId: user.id,
              hasAccess: event.hasAccess,
              eventType: event.eventType,
              eventOccurredAt: event.eventOccurredAt,
              expiresAt: event.expiresAt,
              updatedAt: receivedAt,
            })
            .onConflictDoUpdate({
              target: adaptySubscriptionStates.userId,
              set: {
                hasAccess: event.hasAccess,
                eventType: event.eventType,
                eventOccurredAt: event.eventOccurredAt,
                expiresAt: event.expiresAt,
                updatedAt: receivedAt,
              },
              setWhere: sql`${adaptySubscriptionStates.eventOccurredAt} <= ${event.eventOccurredAt}`,
            });
        }

        return { recorded: true };
      });
    },
  };
}
