import { AnalyticsPort } from '../ports/AnalyticsPort';
import { SubscriptionPort } from '../ports/SubscriptionPort';

export type IdentityPorts = {
  subscription: Pick<SubscriptionPort, 'identify' | 'reset'>;
  analytics: Pick<AnalyticsPort, 'identify' | 'reset'>;
};

// merge: P2-T17's IdentityBridge (mounted in app/_layout.tsx) must call bindIdentity from an
// auth.subscribe handler so the anonymous id at first launch identifies both SDKs too. This task
// owns the ordering law and the sign-in call site (onboarding/resumeAfterSignIn.ts); the mount is T17's.
export function bindIdentity(ports: IdentityPorts, userId: string): void {
  ports.subscription.identify(userId);
  ports.analytics.identify(userId);
}

export async function teardownIdentity(ports: IdentityPorts, teardownAuth: () => Promise<void>): Promise<void> {
  ports.subscription.reset();
  ports.analytics.reset();
  await teardownAuth();
}
