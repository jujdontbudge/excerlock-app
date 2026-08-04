import type { AdaptyEnvironment } from "../db/schema.js";

export interface AdaptySubscriptionEvent {
  customerUserId: string;
  deliveryKey: string;
  eventType: string;
  environment: AdaptyEnvironment;
  eventOccurredAt: Date;
  hasAccess: boolean;
  expiresAt: Date | null;
}

export interface AdaptyWebhookRepository {
  record(
    event: AdaptySubscriptionEvent,
    receivedAt: Date,
  ): Promise<{ recorded: boolean }>;
}
