CREATE TABLE "earned_unlocks" (
	"user_id" text NOT NULL,
	"day" date NOT NULL,
	"rule_id" uuid NOT NULL,
	"rule_name" text NOT NULL,
	"met_at" timestamp with time zone NOT NULL,
	"window_end" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "earned_unlocks_user_id_day_rule_id_pk" PRIMARY KEY("user_id","day","rule_id")
);
--> statement-breakpoint
CREATE TABLE "profiles" (
	"user_id" text PRIMARY KEY NOT NULL,
	"name" text,
	"referral_source" text,
	"age_band" text,
	"occupation" text,
	"improve_first" text,
	"main_reason" text,
	"estimated_daily_minutes" integer,
	"units" text,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rule_days" (
	"user_id" text NOT NULL,
	"rule_id" uuid NOT NULL,
	"day" date NOT NULL,
	"progress" numeric(12, 3) NOT NULL,
	"met" boolean NOT NULL,
	"met_at" timestamp with time zone,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "rule_days_user_id_rule_id_day_pk" PRIMARY KEY("user_id","rule_id","day")
);
--> statement-breakpoint
CREATE TABLE "rules" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"activity" text NOT NULL,
	"mode" jsonb NOT NULL,
	"schedule" jsonb NOT NULL,
	"enabled" boolean NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "usage_days" (
	"user_id" text NOT NULL,
	"day" date NOT NULL,
	"locked_app_minutes" integer NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "usage_days_user_id_day_pk" PRIMARY KEY("user_id","day")
);
--> statement-breakpoint
DROP TABLE "feature_request_votes" CASCADE;--> statement-breakpoint
DROP TABLE "feature_requests" CASCADE;--> statement-breakpoint
DROP TABLE "vendor_connections" CASCADE;--> statement-breakpoint
DROP TABLE "vendor_oauth_states" CASCADE;--> statement-breakpoint
DROP TABLE "vendor_webhook_events" CASCADE;--> statement-breakpoint
ALTER TABLE "users" RENAME COLUMN "clerk_deleted_at" TO "auth_deleted_at";--> statement-breakpoint
ALTER TABLE "earned_unlocks" ADD CONSTRAINT "earned_unlocks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rule_days" ADD CONSTRAINT "rule_days_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rules" ADD CONSTRAINT "rules_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usage_days" ADD CONSTRAINT "usage_days_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "rule_days_user_day_index" ON "rule_days" USING btree ("user_id","day");--> statement-breakpoint
CREATE INDEX "rules_user_updated_index" ON "rules" USING btree ("user_id","updated_at");