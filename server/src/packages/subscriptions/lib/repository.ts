import type { AdaptyEnvironment } from "../../db/schema.js";
export type SubscriptionStatus = "active" | "none" | "expired" | "billingIssue" | "unknown";
export type SubscriptionSource = "webhook" | "resync";
export type SubscriptionSyncState = "current" | "pending" | "unavailable";
export interface EnvironmentObservation { environment: AdaptyEnvironment; status: SubscriptionStatus; hasAccess: boolean; expiresAt: Date | null; isInGracePeriod: boolean; observedAt: Date; source: SubscriptionSource; syncState: SubscriptionSyncState }
export interface AdaptySubscriptionEvent extends EnvironmentObservation { customerUserId: string; deliveryKey: string; eventType: string }
export interface AdaptyWebhookRepository {
  record(event: AdaptySubscriptionEvent, receivedAt: Date): Promise<{ recorded: boolean }>;
  writeObservation(userId: string, observation: EnvironmentObservation, orderingKey: string): Promise<boolean>;
  readSubscriptionState(userId: string, environment: AdaptyEnvironment): Promise<EnvironmentObservation | null>;
}
export interface SubscriptionAuthorization {
  environment: AdaptyEnvironment;
  status: SubscriptionStatus;
  hasAccess: boolean;
  expiresAt: Date | null;
  observedAt: Date | null;
  source: SubscriptionSource | "complimentary" | null;
}
export function authorizeEnvironment(observation: EnvironmentObservation | null, environment: AdaptyEnvironment, now = new Date()): SubscriptionAuthorization {
  const valid = observation?.environment === environment && observation.syncState === "current" && observation.status !== "unknown";
  const active = Boolean(valid && observation.status === "active" && observation.hasAccess && (observation.isInGracePeriod || observation.expiresAt === null || observation.expiresAt > now));
  const status = !valid ? "unknown" : active ? observation.status : observation.expiresAt && observation.expiresAt <= now ? "expired" : observation.status;
  return {
    environment,
    status,
    hasAccess: active,
    expiresAt: valid ? observation.expiresAt : null,
    observedAt: valid ? observation.observedAt : null,
    source: valid ? observation.source : null,
  };
}
export function authorizeProduction(observation: EnvironmentObservation | null, now = new Date()): SubscriptionAuthorization {
  return authorizeEnvironment(observation, "production", now);
}
