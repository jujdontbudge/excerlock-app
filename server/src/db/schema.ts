import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

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
