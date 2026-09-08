CREATE TABLE "history_days" (
	"user_id" text NOT NULL,
	"day" date NOT NULL,
	"usage_minutes" integer,
	"activity" jsonb NOT NULL,
	"met" boolean NOT NULL,
	"scheduled" boolean NOT NULL,
	"sealed_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "history_days_user_id_day_pk" PRIMARY KEY("user_id","day")
);
--> statement-breakpoint
ALTER TABLE "rule_days" ADD COLUMN "unit" text;--> statement-breakpoint
ALTER TABLE "support_requests" ADD COLUMN "reply_to" text;--> statement-breakpoint
ALTER TABLE "support_requests" ADD COLUMN "diagnostics" jsonb;--> statement-breakpoint
ALTER TABLE "history_days" ADD CONSTRAINT "history_days_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;