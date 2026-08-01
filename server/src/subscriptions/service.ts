import { z } from "zod";
import type { AdaptyWebhookRepository } from "./repository.js";

const adaptyEventSchema = z.object({
  customer_user_id: z.string().min(1),
  event_type: z.string().min(1),
  event_properties: z.object({
    profile_event_id: z.string().min(1),
    profile_has_access_level: z.boolean(),
    subscription_expires_at: z.iso.datetime({ offset: true }).nullish(),
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
