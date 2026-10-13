import { sql } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  primaryKey,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import type { SupportCategory } from "@excerlock/analytics-events";
import type { Vendor } from "../model/vendor.js";

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

export const incidentReports = pgTable(
  "incident_reports",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    appVersion: text("app_version").notNull(),
    appBuild: text("app_build").notNull(),
    osVersion: text("os_version"),
    whatWentWrong: text("what_went_wrong").notNull(),
    shouldHaveHappened: text("should_have_happened").notNull(),
    diagnostics: jsonb("diagnostics").notNull(),
    reportedAt: timestamp("reported_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("incident_reports_user_created_index").on(
      table.userId,
      table.createdAt,
    ),
  ],
);

export type IncidentReport = typeof incidentReports.$inferSelect;
export type NewIncidentReport = typeof incidentReports.$inferInsert;

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

export type AdaptyEnvironment = "production" | "sandbox";

export const adaptyWebhookEvents = pgTable("adapty_webhook_events", {
  deliveryKey: text("delivery_key").notNull(),
  userId: text("user_id").references(() => users.id, {
    onDelete: "set null",
  }),
  eventType: text("event_type").notNull(),
  receivedAt: timestamp("received_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  environment: text("environment")
    .$type<AdaptyEnvironment>()
    .notNull()
    .default("production"),
}, (table) => [primaryKey({ columns: [table.environment, table.deliveryKey] })]);

export const adaptySubscriptionStates = pgTable("adapty_subscription_states", {
  userId: text("user_id")
    .notNull()
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
  environment: text("environment")
    .$type<AdaptyEnvironment>()
    .notNull()
    .default("production"),
  status: text("status").notNull().default("unknown"),
  isInGracePeriod: boolean("is_in_grace_period").notNull().default(false),
  source: text("source").notNull().default("webhook"),
  syncState: text("sync_state").notNull().default("current"),
  lastDeliveryKey: text("last_delivery_key").notNull().default("legacy"),
}, (table) => [primaryKey({ columns: [table.userId, table.environment] })]);

export type AdaptyWebhookEvent = typeof adaptyWebhookEvents.$inferSelect;
export type NewAdaptyWebhookEvent = typeof adaptyWebhookEvents.$inferInsert;
export type AdaptySubscriptionState =
  typeof adaptySubscriptionStates.$inferSelect;
export type NewAdaptySubscriptionState =
  typeof adaptySubscriptionStates.$inferInsert;

export const complimentaryAccessGrants = pgTable("complimentary_access_grants", {
  id: text("id").primaryKey(),
  email: text("email"),
  environment: text("environment").$type<AdaptyEnvironment>().notNull(),
  grantedBy: text("granted_by").notNull(),
  grantedAt: timestamp("granted_at", { withTimezone: true }).notNull(),
  note: text("note"),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
  revokedBy: text("revoked_by"),
  matchedUserId: text("matched_user_id").references(() => users.id, { onDelete: "set null" }),
}, (table) => [uniqueIndex("complimentary_access_active_email_environment").on(table.email, table.environment).where(sql`${table.revokedAt} is null`)]);

export const complimentaryAccessAudit = pgTable("complimentary_access_audit", {
  id: text("id").primaryKey(),
  grantId: text("grant_id").notNull().references(() => complimentaryAccessGrants.id),
  action: text("action").$type<"grant" | "revoke" | "erase">().notNull(),
  actor: text("actor").notNull(),
  occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
  note: text("note"),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
});
