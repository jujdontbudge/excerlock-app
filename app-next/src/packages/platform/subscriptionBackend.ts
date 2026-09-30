import type { ClientConfiguration } from './clientConfiguration';

type StoreEnvironment = ClientConfiguration['storeEnvironment'];
export type SubscriptionBackend = { environment: StoreEnvironment; apiBaseUrl: string };

export function subscriptionBackend(
  config: Pick<ClientConfiguration, 'environment' | 'storeEnvironment' | 'auth'>,
  verifiedEnvironment: StoreEnvironment | null,
): SubscriptionBackend | null {
  if (config.environment !== 'prod') {
    return { environment: config.storeEnvironment, apiBaseUrl: config.auth.apiBaseUrl };
  }
  if (verifiedEnvironment === 'production') {
    return { environment: 'production', apiBaseUrl: config.auth.apiBaseUrl };
  }
  if (verifiedEnvironment === 'sandbox') {
    return { environment: 'sandbox', apiBaseUrl: `${config.auth.apiBaseUrl.replace(/\/$/, '')}/testflight` };
  }
  return null;
}
