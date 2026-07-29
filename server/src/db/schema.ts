import {
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import type { Vendor } from "../vendors/types.js";

/**
 * Clerk is the identity spine: this primary key is also the Clerk user id,
 * Adapty customer_user_id, and PostHog distinct_id after sign-up.
 */
export const users = pgTable("users", {
  id: text("id").primaryKey(),
  email: text("email"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export const vendorConnections = pgTable(
  "vendor_connections",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    vendor: text("vendor").$type<Vendor>().notNull(),
    externalUserId: text("external_user_id").notNull(),
    accessTokenCiphertext: text("access_token_ciphertext").notNull(),
    refreshTokenCiphertext: text("refresh_token_ciphertext"),
    accessTokenExpiresAt: timestamp("access_token_expires_at", {
      withTimezone: true,
    }),
    scopes: text("scopes").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("vendor_connections_user_vendor_unique").on(
      table.userId,
      table.vendor,
    ),
    uniqueIndex("vendor_connections_vendor_external_user_unique").on(
      table.vendor,
      table.externalUserId,
    ),
  ],
);

export const vendorOAuthStates = pgTable(
  "vendor_oauth_states",
  {
    stateHash: text("state_hash").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    vendor: text("vendor").$type<Vendor>().notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("vendor_oauth_states_expiry_index").on(table.expiresAt),
  ],
);

export const vendorWebhookEvents = pgTable(
  "vendor_webhook_events",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    vendor: text("vendor").$type<Vendor>().notNull(),
    externalUserId: text("external_user_id").notNull(),
    deliveryKey: text("delivery_key").notNull(),
    eventType: text("event_type").notNull(),
    rawPayload: text("raw_payload").notNull(),
    receivedAt: timestamp("received_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("vendor_webhook_events_delivery_unique").on(
      table.vendor,
      table.deliveryKey,
    ),
    index("vendor_webhook_events_user_cursor_index").on(
      table.userId,
      table.receivedAt,
      table.id,
    ),
  ],
);

export type VendorConnection = typeof vendorConnections.$inferSelect;
export type NewVendorConnection = typeof vendorConnections.$inferInsert;
export type VendorOAuthState = typeof vendorOAuthStates.$inferSelect;
export type NewVendorOAuthState = typeof vendorOAuthStates.$inferInsert;
export type VendorWebhookEvent = typeof vendorWebhookEvents.$inferSelect;
export type NewVendorWebhookEvent = typeof vendorWebhookEvents.$inferInsert;
