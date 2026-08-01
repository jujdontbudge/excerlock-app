export interface AdaptySubscriptionEvent {
  customerUserId: string;
  deliveryKey: string;
  eventType: string;
  hasAccess: boolean;
  expiresAt: Date | null;
}

export interface AdaptyWebhookRepository {
  record(
    event: AdaptySubscriptionEvent,
    receivedAt: Date,
  ): Promise<{ recorded: boolean }>;
}
