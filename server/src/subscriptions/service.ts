import { z } from "zod";
import type { AdaptyWebhookRepository, SubscriptionStatus } from "./repository.js";

const envelopeSchema = z.object({
  customer_user_id: z.string().min(1).nullish(),
  event_type: z.string().min(1),
  event_datetime: z.string().refine((value) => !Number.isNaN(Date.parse(value))),
  event_properties: z.record(z.string(), z.unknown()),
});
const premiumAccessEventSchema = envelopeSchema.extend({
  event_type: z.literal("access_level_updated"),
  event_properties: z.object({
    profile_event_id: z.string().min(1),
    access_level_id: z.literal("premium"),
    environment: z.string().transform((value) => value.toLowerCase()).pipe(z.enum(["sandbox", "production"])),
    is_active: z.boolean(),
    expires_at: z.string().refine((value) => !Number.isNaN(Date.parse(value))).nullish(),
    is_in_grace_period: z.boolean(),
    billing_issue_detected_at: z.unknown().nullish(),
  }).passthrough(),
});
function statusFor(active: boolean, expiresAt: Date | null, billing: boolean, now: Date): SubscriptionStatus {
  if (active) return "active";
  if (billing) return "billingIssue";
  if (expiresAt && expiresAt <= now) return "expired";
  return "none";
}
export interface AdaptyWebhookService { record(payload: unknown): Promise<{ recorded: boolean; unbound?: boolean }> }
export function createAdaptyWebhookService(repository: AdaptyWebhookRepository, now: () => Date = () => new Date(), acceptedEnvironments: readonly ("production" | "sandbox")[] = ["production", "sandbox"]): AdaptyWebhookService {
  return { async record(payload) {
    const envelope = envelopeSchema.parse(payload);
    // Official Adapty docs define customer_user_id as nullable. Authenticate
    // and acknowledge before requiring lifecycle-specific properties.
    if (!envelope.customer_user_id) return { recorded: false, unbound: true };
    if (envelope.event_type !== "access_level_updated") return { recorded: false };
    if (envelope.event_properties.access_level_id !== "premium") return { recorded: false };
    const parsed = premiumAccessEventSchema.parse(payload);
    if (!parsed.customer_user_id) return { recorded: false, unbound: true };
    // Transaction lifecycle events expose profile-wide access, which is not
    // safe to attribute to one store partition. Only the documented premium
    // access_level_updated shape is authoritative.
    const properties = parsed.event_properties;
    if (!acceptedEnvironments.includes(properties.environment)) return { recorded: false };
    const observedAt = new Date(parsed.event_datetime);
    const expiresAt = properties.expires_at ? new Date(properties.expires_at) : null;
    return repository.record({
      customerUserId: parsed.customer_user_id,
      deliveryKey: properties.profile_event_id,
      eventType: parsed.event_type,
      environment: properties.environment,
      observedAt,
      hasAccess: properties.is_active,
      expiresAt,
      isInGracePeriod: properties.is_in_grace_period,
      status: statusFor(properties.is_active, expiresAt, Boolean(properties.billing_issue_detected_at), now()),
      source: "webhook",
      syncState: "current",
    }, now());
  } };
}
