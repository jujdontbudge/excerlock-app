ALTER TABLE "users" ADD COLUMN "auth_provider" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "auth_deleted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "deletion_attempts" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "deletion_next_retry_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "deletion_lease_owner" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "deletion_lease_expires_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "deletion_last_error" text;--> statement-breakpoint
UPDATE "users" SET "auth_provider" = 'clerk' WHERE ("clerk_deleted_at" IS NOT NULL OR left("id", 5) = 'user_') AND "auth_provider" IS NULL;
