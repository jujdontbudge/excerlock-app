import type { AnalyticsPort } from '../ports/AnalyticsPort';
import type { SubscriptionPort } from '../ports/SubscriptionPort';

export type RestoreOutcome = 'restored' | 'notFound';

export async function restorePurchases(subscription: SubscriptionPort, analytics: AnalyticsPort): Promise<RestoreOutcome> {
  analytics.track('restore_started');
  try {
    const { status } = await subscription.restore();
    if (status === 'trial' || status === 'active') {
      analytics.track('restore_succeeded');
      return 'restored';
    }
    analytics.track('restore_failed', { reason_class: 'unavailable' });
    return 'notFound';
  } catch (error) {
    analytics.track('restore_failed', { reason_class: 'unknown' });
    throw error;
  }
}
