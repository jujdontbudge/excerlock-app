CREATE TABLE "complimentary_access_audit" (
	"id" text PRIMARY KEY NOT NULL,
	"grant_id" text NOT NULL,
	"action" text NOT NULL,
	"actor" text NOT NULL,
	"occurred_at" timestamp with time zone NOT NULL,
	"note" text,
	"expires_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "complimentary_access_grants" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text,
	"environment" text NOT NULL,
	"granted_by" text NOT NULL,
	"granted_at" timestamp with time zone NOT NULL,
	"note" text,
	"expires_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	"revoked_by" text,
	"matched_user_id" text
);
--> statement-breakpoint
ALTER TABLE "complimentary_access_audit" ADD CONSTRAINT "complimentary_access_audit_grant_id_complimentary_access_grants_id_fk" FOREIGN KEY ("grant_id") REFERENCES "public"."complimentary_access_grants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "complimentary_access_grants" ADD CONSTRAINT "complimentary_access_grants_matched_user_id_users_id_fk" FOREIGN KEY ("matched_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "complimentary_access_active_email_environment" ON "complimentary_access_grants" USING btree ("email","environment") WHERE "complimentary_access_grants"."revoked_at" is null;