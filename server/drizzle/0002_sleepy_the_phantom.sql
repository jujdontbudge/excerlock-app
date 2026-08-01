ALTER TABLE "users" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "adapty_erased_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "posthog_erased_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "clerk_deleted_at" timestamp with time zone;