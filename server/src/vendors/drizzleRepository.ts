import { and, eq, gt } from "drizzle-orm";
import { getDb } from "../db/client.js";
import {
  vendorConnections,
  vendorOAuthStates,
} from "../db/schema.js";
import type {
  NewVendorConnectionRecord,
  NewVendorOAuthStateRecord,
  NewVendorTokenRecord,
  VendorOAuthStateRepository,
} from "./repository.js";
import type { Vendor } from "./types.js";

type VendorDatabase = NonNullable<ReturnType<typeof getDb>>;

export function createDrizzleVendorRepository(
  database: VendorDatabase | null = getDb(),
): VendorOAuthStateRepository {
  if (!database) {
    throw new Error(
      "Vendor persistence is not configured; missing DATABASE_URL",
    );
  }

  return {
    async saveOAuthState(state: NewVendorOAuthStateRecord) {
      await database.insert(vendorOAuthStates).values(state);
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
      await database
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
  };
}
