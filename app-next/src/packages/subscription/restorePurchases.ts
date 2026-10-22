import type { PaywallPlacement } from '@excerlock/analytics-events';
import type { SubscriptionPort } from '../ports/SubscriptionPort';

export type RestoreOutcome = 'restored' | 'notFound';

export async function restorePurchases(subscription: SubscriptionPort, placement: PaywallPlacement = 'in_app'): Promise<RestoreOutcome> {
  const { status } = await subscription.restore({ placement });
  return status === 'trial' || status === 'active' ? 'restored' : 'notFound';
}
