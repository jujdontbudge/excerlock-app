CREATE TABLE "incident_reports" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"app_version" text NOT NULL,
	"app_build" text NOT NULL,
	"os_version" text,
	"what_went_wrong" text NOT NULL,
	"should_have_happened" text NOT NULL,
	"diagnostics" jsonb NOT NULL,
	"reported_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "incident_reports" ADD CONSTRAINT "incident_reports_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "incident_reports_user_created_index" ON "incident_reports" USING btree ("user_id","created_at");