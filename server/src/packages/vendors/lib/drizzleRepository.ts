import { and, asc, eq, gt, isNull, or } from "drizzle-orm";
import type { PgDatabase } from "drizzle-orm/pg-core";
import { getDb } from "../../db/client.js";
import {
  vendorConnections,
  vendorOAuthStates,
  vendorWebhookEvents,
  users,
} from "../../db/schema.js";
import type {
  VendorEventFeedRepository,
  VendorWebhookRepository,
} from "../../webhooks/repository.js";
import type {
  NewVendorConnectionRecord,
  NewVendorOAuthStateRecord,
  NewVendorTokenRecord,
  VendorOAuthStateRepository,
} from "./repository.js";
import type { Vendor } from "../../model/vendor.js";

type VendorDatabase = PgDatabase<
  any,
  typeof import("../../db/schema.js")
>;
type VendorTransaction = Parameters<
  Parameters<VendorDatabase["transaction"]>[0]
>[0];

export type VendorRepository = VendorOAuthStateRepository &
  VendorWebhookRepository &
  VendorEventFeedRepository;

export function createDrizzleVendorRepository(
  database: VendorDatabase | null = getDb(),
): VendorRepository {
  if (!database) {
    throw new Error(
      "Vendor persistence is not configured; missing DATABASE_URL",
    );
  }

  async function lockActiveUser(
    transaction: VendorTransaction,
    userId: string,
  ): Promise<void> {
    const [activeUser] = await transaction
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.id, userId), isNull(users.deletedAt)))
      .limit(1)
      .for("update");
    if (!activeUser) {
      throw new Error("User is deleted or missing");
    }
  }

  return {
    async saveOAuthState(state: NewVendorOAuthStateRecord) {
      await database.transaction(async (transaction) => {
        await lockActiveUser(transaction, state.userId);
        await transaction.insert(vendorOAuthStates).values(state);
      });
    },

    async consumeOAuthState(stateHash, vendor, now) {
      const [state] = await database
        .delete(vendorOAuthStates)
        .where(
          and(
            eq(vendorOAuthStates.stateHash, stateHash),
            eq(vendorOAuthStates.vendor, vendor),
            gt(vendorOAuthStates.expiresAt, now),
          ),
        )
        .returning({
          stateHash: vendorOAuthStates.stateHash,
          userId: vendorOAuthStates.userId,
          vendor: vendorOAuthStates.vendor,
          expiresAt: vendorOAuthStates.expiresAt,
        });

      return state ?? null;
    },

    async upsertConnection(connection: NewVendorConnectionRecord) {
      await database.transaction(async (transaction) => {
        await lockActiveUser(transaction, connection.userId);
        await transaction
          .insert(vendorConnections)
          .values(connection)
          .onConflictDoUpdate({
            target: [vendorConnections.userId, vendorConnections.vendor],
            set: {
              externalUserId: connection.externalUserId,
              accessTokenCiphertext: connection.accessTokenCiphertext,
              refreshTokenCiphertext: connection.refreshTokenCiphertext,
              accessTokenExpiresAt: connection.accessTokenExpiresAt,
              scopes: connection.scopes,
              updatedAt: new Date(),
            },
          });
      });
    },

    async findConnection(userId: string, vendor: Vendor) {
      const [connection] = await database
        .select({
          id: vendorConnections.id,
          userId: vendorConnections.userId,
          vendor: vendorConnections.vendor,
          externalUserId: vendorConnections.externalUserId,
          accessTokenCiphertext:
            vendorConnections.accessTokenCiphertext,
          refreshTokenCiphertext:
            vendorConnections.refreshTokenCiphertext,
          accessTokenExpiresAt:
            vendorConnections.accessTokenExpiresAt,
          scopes: vendorConnections.scopes,
        })
        .from(vendorConnections)
        .where(
          and(
            eq(vendorConnections.userId, userId),
            eq(vendorConnections.vendor, vendor),
          ),
        )
        .limit(1);

      return connection ?? null;
    },

    async updateConnectionTokens(
      connectionId: string,
      tokens: NewVendorTokenRecord,
    ) {
      await database
        .update(vendorConnections)
        .set({ ...tokens, updatedAt: new Date() })
        .where(eq(vendorConnections.id, connectionId));
    },

    async deleteConnection(connectionId: string) {
      await database
        .delete(vendorConnections)
        .where(eq(vendorConnections.id, connectionId));
    },

    async findConnectionByExternalUserId(vendor, externalUserId) {
      const [connection] = await database
        .select({
          id: vendorConnections.id,
          userId: vendorConnections.userId,
          vendor: vendorConnections.vendor,
          externalUserId: vendorConnections.externalUserId,
        })
        .from(vendorConnections)
        .where(
          and(
            eq(vendorConnections.vendor, vendor),
            eq(vendorConnections.externalUserId, externalUserId),
          ),
        )
        .limit(1);

      return connection ?? null;
    },

    async insertWebhookEvent(event) {
      const [inserted] = await database
        .insert(vendorWebhookEvents)
        .values(event)
        .onConflictDoNothing({
          target: [
            vendorWebhookEvents.vendor,
            vendorWebhookEvents.deliveryKey,
          ],
        })
        .returning({ id: vendorWebhookEvents.id });
      if (inserted) {
        return { inserted: true, eventId: inserted.id };
      }

      const [existing] = await database
        .select({ id: vendorWebhookEvents.id })
        .from(vendorWebhookEvents)
        .where(
          and(
            eq(vendorWebhookEvents.vendor, event.vendor),
            eq(vendorWebhookEvents.deliveryKey, event.deliveryKey),
          ),
        )
        .limit(1);
      if (!existing) {
        throw new Error("Webhook replay row disappeared after conflict");
      }

      return { inserted: false, eventId: existing.id };
    },

    async listWebhookEvents(userId, after, limit) {
      return database
        .select({
          id: vendorWebhookEvents.id,
          userId: vendorWebhookEvents.userId,
          vendor: vendorWebhookEvents.vendor,
          externalUserId: vendorWebhookEvents.externalUserId,
          deliveryKey: vendorWebhookEvents.deliveryKey,
          eventType: vendorWebhookEvents.eventType,
          rawPayload: vendorWebhookEvents.rawPayload,
          receivedAt: vendorWebhookEvents.receivedAt,
        })
        .from(vendorWebhookEvents)
        .where(
          and(
            eq(vendorWebhookEvents.userId, userId),
            after
              ? or(
                  gt(vendorWebhookEvents.receivedAt, after.receivedAt),
                  and(
                    eq(
                      vendorWebhookEvents.receivedAt,
                      after.receivedAt,
                    ),
                    gt(vendorWebhookEvents.id, after.id),
                  ),
                )
              : undefined,
          ),
        )
        .orderBy(
          asc(vendorWebhookEvents.receivedAt),
          asc(vendorWebhookEvents.id),
        )
        .limit(limit);
    },
  };
}
