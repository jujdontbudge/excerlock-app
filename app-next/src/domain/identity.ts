import { AnalyticsPort } from '../ports/AnalyticsPort';
import { SubscriptionPort } from '../ports/SubscriptionPort';

export type IdentityPorts = {
  subscription: Pick<SubscriptionPort, 'identify' | 'reset'>;
  analytics: Pick<AnalyticsPort, 'identify' | 'reset'>;
};

export function bindIdentity(ports: IdentityPorts, userId: string): void {
  ports.subscription.identify(userId);
  ports.analytics.identify(userId);
}

export async function teardownIdentity(ports: IdentityPorts, teardownAuth: () => Promise<void>): Promise<void> {
  ports.subscription.reset();
  ports.analytics.reset();
  await teardownAuth();
}
