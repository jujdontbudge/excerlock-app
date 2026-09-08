import { AnalyticsPort } from '../ports/AnalyticsPort';
import { SubscriptionPort } from '../ports/SubscriptionPort';

export type IdentityPorts = {
  subscription: Pick<SubscriptionPort, 'identify' | 'reset'>;
  analytics: Pick<AnalyticsPort, 'identify' | 'reset'>;
};

/**
 * The SDK ordering law. `runtime/IdentityBridge` mounts it from a session subscription, so every
 * session change — including the anonymous id at first launch — identifies both SDKs in this order.
 *
 * Identify runs subscription-first so an entitlement fetch is already scoped to the user before the
 * first event is attributed.
 */
export function bindIdentity(ports: IdentityPorts, userId: string): void {
  ports.subscription.identify(userId);
  ports.analytics.identify(userId);
}

export async function teardownIdentity(ports: IdentityPorts, teardownAuth: () => Promise<void>): Promise<void> {
  ports.subscription.reset();
  ports.analytics.reset();
  await teardownAuth();
}
