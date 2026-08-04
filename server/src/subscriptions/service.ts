import { z } from "zod";
import type { AdaptyWebhookRepository } from "./repository.js";

const adaptyEventSchema = z.object({
  customer_user_id: z.string().min(1),
  event_type: z.string().min(1),
  event_datetime: z
    .string()
    .refine((value) => !Number.isNaN(Date.parse(value))),
  event_properties: z.object({
    profile_event_id: z.string().min(1),
    profile_has_access_level: z.boolean(),
    // Adapty sends "Sandbox" or "Production" on every event. Required on
    // purpose: an event we cannot attribute to a store must fail loudly
    // rather than default into the revenue-bearing side.
    environment: z
      .string()
      .transform((value) => value.toLowerCase())
      .pipe(z.enum(["sandbox", "production"])),
    subscription_expires_at: z
      .string()
      .refine((value) => !Number.isNaN(Date.parse(value)))
      .nullish(),
  }),
});

export interface AdaptyWebhookService {
  record(payload: unknown): Promise<{ recorded: boolean }>;
}

export function createAdaptyWebhookService(
  repository: AdaptyWebhookRepository,
  now: () => Date = () => new Date(),
): AdaptyWebhookService {
  return {
    async record(payload) {
      const parsed = adaptyEventSchema.parse(payload);
      return repository.record(
        {
          customerUserId: parsed.customer_user_id,
          deliveryKey: parsed.event_properties.profile_event_id,
          eventType: parsed.event_type,
          environment: parsed.event_properties.environment,
          eventOccurredAt: new Date(parsed.event_datetime),
          hasAccess: parsed.event_properties.profile_has_access_level,
          expiresAt: parsed.event_properties.subscription_expires_at
            ? new Date(parsed.event_properties.subscription_expires_at)
            : null,
        },
        now(),
      );
    },
  };
}
