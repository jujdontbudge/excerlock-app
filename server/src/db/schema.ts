import {
  boolean,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import type { SupportCategory } from "@excerlock/analytics-events";
import type { Vendor } from "../vendors/types.js";

/**
 * Canonical Supabase identity spine: this primary key is the Supabase user id
 * (canonical UUID, anonymous or permanent), and simultaneously the Adapty
 * customer_user_id and PostHog distinct_id after provisioning.
 *
 * Legacy Clerk ids (user_*) remain only on historic tombstones. The
 * auth_provider/auth_deleted_at pair records provider-neutral erasure;
 * clerk_deleted_at is retained for audit and must never be treated as proof
 * of Supabase erasure.
 */
export const users = pgTable("users", {
  id: text("id").primaryKey(),
  email: text("email"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
  adaptyErasedAt: timestamp("adapty_erased_at", { withTimezone: true }),
  posthogErasedAt: timestamp("posthog_erased_at", { withTimezone: true }),
  clerkDeletedAt: timestamp("clerk_deleted_at", { withTimezone: true }),
  authProvider: text("auth_provider"),
  authDeletedAt: timestamp("auth_deleted_at", { withTimezone: true }),
  deletionAttempts: integer("deletion_attempts").notNull().default(0),
  deletionNextRetryAt: timestamp("deletion_next_retry_at", { withTimezone: true }),
  deletionLeaseOwner: text("deletion_lease_owner"),
  deletionLeaseExpiresAt: timestamp("deletion_lease_expires_at", { withTimezone: true }),
  deletionLastError: text("deletion_last_error"),
}, (table) => [
  index("users_deletion_retry_index").on(table.deletedAt, table.deletionNextRetryAt),
]);

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export const supportRequests = pgTable("support_requests", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  category: text("category").$type<SupportCategory>().notNull(),
  title: text("title"),
  message: text("message").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const featureRequests = pgTable(
  "feature_requests",
  {
    id: text("id").primaryKey(),
    supportRequestId: text("support_request_id")
      .notNull()
      .references(() => supportRequests.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    message: text("message").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("feature_requests_support_request_unique").on(
      table.supportRequestId,
    ),
    index("feature_requests_created_at_index").on(table.createdAt, table.id),
  ],
);

export const featureRequestVotes = pgTable(
  "feature_request_votes",
  {
    id: text("id").primaryKey(),
    featureRequestId: text("feature_request_id")
      .notNull()
      .references(() => featureRequests.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("feature_request_votes_request_user_unique").on(
      table.featureRequestId,
      table.userId,
    ),
  ],
);

export type SupportRequest = typeof supportRequests.$inferSelect;
export type NewSupportRequest = typeof supportRequests.$inferInsert;
export type FeatureRequest = typeof featureRequests.$inferSelect;
export type NewFeatureRequest = typeof featureRequests.$inferInsert;
export type FeatureRequestVote = typeof featureRequestVotes.$inferSelect;
export type NewFeatureRequestVote = typeof featureRequestVotes.$inferInsert;

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

/**
 * Store environment a purchase event originated from. Sandbox rows are
 * TestFlight/StoreKit test purchases; anything that counts revenue or
 * customers must filter to "production".
 */
export type AdaptyEnvironment = "production" | "sandbox";

/**
 * Minimal Adapty delivery ledger. Payloads, profile ids, transaction ids, and
 * purchase values are deliberately not retained. The stable profile event id
 * is sufficient for retry idempotency.
 */
export const adaptyWebhookEvents = pgTable("adapty_webhook_events", {
  deliveryKey: text("delivery_key").primaryKey(),
  userId: text("user_id").references(() => users.id, {
    onDelete: "set null",
  }),
  eventType: text("event_type").notNull(),
  receivedAt: timestamp("received_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  // Declared last to mirror the physical column order: it arrived via
  // ALTER TABLE, and the catalog guardrail checks ordinals.
  environment: text("environment")
    .$type<AdaptyEnvironment>()
    .notNull()
    .default("production"),
});

/** Current subscription access mirror for active accounts only. */
export const adaptySubscriptionStates = pgTable("adapty_subscription_states", {
  userId: text("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  hasAccess: boolean("has_access").notNull(),
  eventType: text("event_type").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  eventOccurredAt: timestamp("event_occurred_at", {
    withTimezone: true,
  }).notNull(),
  // Declared last to mirror the physical column order: it arrived via
  // ALTER TABLE, and the catalog guardrail checks ordinals.
  environment: text("environment")
    .$type<AdaptyEnvironment>()
    .notNull()
    .default("production"),
});

export type AdaptyWebhookEvent = typeof adaptyWebhookEvents.$inferSelect;
export type NewAdaptyWebhookEvent = typeof adaptyWebhookEvents.$inferInsert;
export type AdaptySubscriptionState =
  typeof adaptySubscriptionStates.$inferSelect;
export type NewAdaptySubscriptionState =
  typeof adaptySubscriptionStates.$inferInsert;
