ALTER TABLE "adapty_subscription_states" DROP CONSTRAINT "adapty_subscription_states_pkey";--> statement-breakpoint
ALTER TABLE "adapty_webhook_events" DROP CONSTRAINT "adapty_webhook_events_pkey";--> statement-breakpoint
ALTER TABLE "adapty_subscription_states" ADD CONSTRAINT "adapty_subscription_states_user_id_environment_pk" PRIMARY KEY("user_id","environment");--> statement-breakpoint
ALTER TABLE "adapty_webhook_events" ADD CONSTRAINT "adapty_webhook_events_environment_delivery_key_pk" PRIMARY KEY("environment","delivery_key");--> statement-breakpoint
ALTER TABLE "adapty_subscription_states" ADD COLUMN "status" text DEFAULT 'unknown' NOT NULL;--> statement-breakpoint
ALTER TABLE "adapty_subscription_states" ADD COLUMN "is_in_grace_period" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "adapty_subscription_states" ADD COLUMN "source" text DEFAULT 'webhook' NOT NULL;--> statement-breakpoint
ALTER TABLE "adapty_subscription_states" ADD COLUMN "sync_state" text DEFAULT 'current' NOT NULL;--> statement-breakpoint
ALTER TABLE "adapty_subscription_states" ADD COLUMN "last_delivery_key" text DEFAULT 'legacy' NOT NULL;
