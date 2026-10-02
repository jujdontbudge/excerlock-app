import AsyncStorage from '@react-native-async-storage/async-storage';
import type { AnalyticsPort } from '../../ports/AnalyticsPort';
import type { PropsOf } from '@excerlock/analytics-events';
import { getOtaObservabilityContext, isKnownFirstInstall, noteOtaPaywallReached } from '../../updates/updates';

const FIRST_PAYWALL_KEY = 'excerlock-next.first-paywall.v1';
let tail = Promise.resolve();

export function recordPaywallImpression(analytics: AnalyticsPort, properties: PropsOf<'paywall_viewed'>): Promise<void> {
  const work = tail.then(async () => {
    await noteOtaPaywallReached();
    const unobserved = await AsyncStorage.getItem(FIRST_PAYWALL_KEY) === null;
    const first = unobserved && await isKnownFirstInstall();
    const context = getOtaObservabilityContext();
    if (unobserved) await AsyncStorage.setItem(FIRST_PAYWALL_KEY, JSON.stringify({ updateId: context.update_id, embedded: context.is_embedded, first }));
    analytics.track('paywall_viewed', { ...properties, first_paywall_view: first,
      is_embedded: context.is_embedded ?? false, update_id: context.update_id ?? 'development' });
  });
  tail = work.catch(() => undefined);
  return work;
}
