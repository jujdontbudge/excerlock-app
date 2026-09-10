-- Forward-only bridge for databases that applied the superseded 2026-09-07
-- Supabase sync migrations. Fresh databases retain clerk_deleted_at and all
-- five legacy-backed API tables, so every operation below is a no-op there.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'auth_deleted_at'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'clerk_deleted_at'
  ) THEN
    IF EXISTS (
      SELECT 1 FROM "users"
      WHERE "auth_deleted_at" IS NOT NULL AND left("id", 5) <> 'user_'
    ) THEN
      RAISE EXCEPTION 'Ambiguous legacy auth_deleted_at provider; classify tombstones before migration';
    END IF;
    ALTER TABLE "users" RENAME COLUMN "auth_deleted_at" TO "clerk_deleted_at";
  END IF;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "vendor_connections" (
  "id" text PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL,
  "vendor" text NOT NULL,
  "external_user_id" text NOT NULL,
  "access_token_ciphertext" text NOT NULL,
  "refresh_token_ciphertext" text,
  "access_token_expires_at" timestamp with time zone,
  "scopes" text DEFAULT '' NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "vendor_connections_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "vendor_connections_user_vendor_unique" ON "vendor_connections" ("user_id", "vendor");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "vendor_connections_vendor_external_user_unique" ON "vendor_connections" ("vendor", "external_user_id");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "vendor_oauth_states" (
  "state_hash" text PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL,
  "vendor" text NOT NULL,
  "expires_at" timestamp with time zone NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "vendor_oauth_states_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "vendor_oauth_states_expiry_index" ON "vendor_oauth_states" ("expires_at");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "vendor_webhook_events" (
  "id" text PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL,
  "vendor" text NOT NULL,
  "external_user_id" text NOT NULL,
  "delivery_key" text NOT NULL,
  "event_type" text NOT NULL,
  "raw_payload" text NOT NULL,
  "received_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "vendor_webhook_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "vendor_webhook_events_delivery_unique" ON "vendor_webhook_events" ("vendor", "delivery_key");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "vendor_webhook_events_user_cursor_index" ON "vendor_webhook_events" ("user_id", "received_at", "id");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "feature_requests" (
  "id" text PRIMARY KEY NOT NULL,
  "support_request_id" text NOT NULL,
  "title" text NOT NULL,
  "message" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "feature_requests_support_request_id_support_requests_id_fk" FOREIGN KEY ("support_request_id") REFERENCES "public"."support_requests"("id") ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "feature_requests_support_request_unique" ON "feature_requests" ("support_request_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "feature_requests_created_at_index" ON "feature_requests" ("created_at", "id");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "feature_request_votes" (
  "id" text PRIMARY KEY NOT NULL,
  "feature_request_id" text NOT NULL,
  "user_id" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "feature_request_votes_feature_request_id_feature_requests_id_fk" FOREIGN KEY ("feature_request_id") REFERENCES "public"."feature_requests"("id") ON DELETE cascade,
  CONSTRAINT "feature_request_votes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "feature_request_votes_request_user_unique" ON "feature_request_votes" ("feature_request_id", "user_id");
