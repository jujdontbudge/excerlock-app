import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import type { SupportCategory } from "@excerlock/analytics-events";

/**
 * Supabase is the identity spine: this primary key is also the Supabase user
 * id (`sub`), the Adapty `customer_user_id`, and the PostHog `distinct_id`.
 */
export const users = pgTable("users", {
  id: text("id").primaryKey(),
  email: text("email"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
  adaptyErasedAt: timestamp("adapty_erased_at", { withTimezone: true }),
  posthogErasedAt: timestamp("posthog_erased_at", { withTimezone: true }),
  /** Stamped once the auth provider has erased the account. Last in the order. */
  authDeletedAt: timestamp("auth_deleted_at", { withTimezone: true }),
});

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

export type SupportRequest = typeof supportRequests.$inferSelect;
export type NewSupportRequest = typeof supportRequests.$inferInsert;

/**
 * Sync mirror of the device's conditions (D5). The device is authoritative;
 * these rows exist so a new phone can restore, and so support can see what a
 * user configured. Nothing here drives enforcement.
 *
 * Privacy law for this whole section: no app names, no bundle identifiers, no
 * location coordinates, no health samples. Gym places and their coordinates
 * never leave the device.
 */
export const rules = pgTable(
  "rules",
  {
    id: uuid("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    activity: text("activity").notNull(),
    /** `RuleMode` verbatim; goals and metrics only. */
    mode: jsonb("mode").notNull(),
    /** `Schedule` verbatim: weekdays and a minute-of-day window. */
    schedule: jsonb("schedule").notNull(),
    enabled: boolean("enabled").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
    /** Tombstone. A deleted rule stays visible to sync so other devices agree. */
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [index("rules_user_updated_index").on(table.userId, table.updatedAt)],
);

/**
 * One row per rule per local day. `progress` is an aggregate number in the
 * rule's own unit (steps, minutes, km/mi) and never a sample series.
 *
 * `rule_id` deliberately carries no foreign key: sync batches arrive in any
 * order, and a day that was met must survive the deletion of the rule that
 * earned it (B23).
 */
export const ruleDays = pgTable(
  "rule_days",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    ruleId: uuid("rule_id").notNull(),
    day: date("day", { mode: "string" }).notNull(),
    progress: numeric("progress", { precision: 12, scale: 3 }).notNull(),
    met: boolean("met").notNull(),
    metAt: timestamp("met_at", { withTimezone: true }),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.ruleId, table.day] }),
    index("rule_days_user_day_index").on(table.userId, table.day),
  ],
);

/**
 * Locked-app minutes per local day (B15), the input to "time reclaimed".
 * A single total; the app picker's selection never leaves the device.
 */
export const usageDays = pgTable(
  "usage_days",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    day: date("day", { mode: "string" }).notNull(),
    lockedAppMinutes: integer("locked_app_minutes").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
  },
  (table) => [primaryKey({ columns: [table.userId, table.day] })],
);

/**
 * The record that keeps today's apps open (B23). Kept without a rule foreign
 * key on purpose: pausing, editing or deleting the condition that earned it
 * must not revoke the unlock.
 */
export const earnedUnlocks = pgTable(
  "earned_unlocks",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    day: date("day", { mode: "string" }).notNull(),
    ruleId: uuid("rule_id").notNull(),
    ruleName: text("rule_name").notNull(),
    metAt: timestamp("met_at", { withTimezone: true }).notNull(),
    windowEnd: timestamp("window_end", { withTimezone: true }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.day, table.ruleId] }),
  ],
);

/** The onboarding answers that are not rules (product model §8). */
export const profiles = pgTable("profiles", {
  userId: text("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  name: text("name"),
  referralSource: text("referral_source"),
  ageBand: text("age_band"),
  occupation: text("occupation"),
  improveFirst: text("improve_first"),
  mainReason: text("main_reason"),
  estimatedDailyMinutes: integer("estimated_daily_minutes"),
  units: text("units"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
});

export type Rule = typeof rules.$inferSelect;
export type NewRule = typeof rules.$inferInsert;
export type RuleDay = typeof ruleDays.$inferSelect;
export type NewRuleDay = typeof ruleDays.$inferInsert;
export type UsageDay = typeof usageDays.$inferSelect;
export type NewUsageDay = typeof usageDays.$inferInsert;
export type EarnedUnlock = typeof earnedUnlocks.$inferSelect;
export type NewEarnedUnlock = typeof earnedUnlocks.$inferInsert;
export type Profile = typeof profiles.$inferSelect;
export type NewProfile = typeof profiles.$inferInsert;

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
