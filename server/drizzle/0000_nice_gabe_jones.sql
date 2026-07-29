CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vendor_connections" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"vendor" text NOT NULL,
	"external_user_id" text NOT NULL,
	"access_token_ciphertext" text NOT NULL,
	"refresh_token_ciphertext" text,
	"access_token_expires_at" timestamp with time zone,
	"scopes" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vendor_oauth_states" (
	"state_hash" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"vendor" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vendor_webhook_events" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"vendor" text NOT NULL,
	"external_user_id" text NOT NULL,
	"delivery_key" text NOT NULL,
	"event_type" text NOT NULL,
	"raw_payload" text NOT NULL,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "vendor_connections" ADD CONSTRAINT "vendor_connections_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vendor_oauth_states" ADD CONSTRAINT "vendor_oauth_states_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vendor_webhook_events" ADD CONSTRAINT "vendor_webhook_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "vendor_connections_user_vendor_unique" ON "vendor_connections" USING btree ("user_id","vendor");--> statement-breakpoint
CREATE UNIQUE INDEX "vendor_connections_vendor_external_user_unique" ON "vendor_connections" USING btree ("vendor","external_user_id");--> statement-breakpoint
CREATE INDEX "vendor_oauth_states_expiry_index" ON "vendor_oauth_states" USING btree ("expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "vendor_webhook_events_delivery_unique" ON "vendor_webhook_events" USING btree ("vendor","delivery_key");--> statement-breakpoint
CREATE INDEX "vendor_webhook_events_user_cursor_index" ON "vendor_webhook_events" USING btree ("user_id","received_at","id");