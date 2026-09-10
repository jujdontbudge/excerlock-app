import { Linking } from 'react-native';
import type { AuthIdentity } from '../ports/AuthPort';
import { createAuthServices, type AuthServiceConfig, type AuthServices } from './auth/createAuthServices';
import { AdaptySubscriptionAdapter } from './subscription/AdaptySubscriptionAdapter';
import { nativeAdaptySdk } from './subscription/nativeAdaptySdk';
import type { AdaptySdkPort } from './subscription/adaptySdk';

type AnalyticsIdentityHooks = {
  identify(id: string): Promise<void>;
  reset(): Promise<void>;
  getDistinctId(): string | null;
  dispose(): void;
};
/** One identity graph: callbacks close over services, never create competing gates. */
export function createIdentityServices(options: {
  config: Pick<AuthServiceConfig, 'supabaseUrl' | 'supabaseAnonKey' | 'apiBaseUrl' | 'googleIosClientId' | 'googleRedirectUri'>;
  adaptyPublicKey: string;
  analyticsFactory(getIdentity: () => AuthIdentity): AnalyticsIdentityHooks;
  beforeDelete(): Promise<void>;
  sdk?: AdaptySdkPort;
}) {
  let authServices: AuthServices | undefined;
  const getIdentity = (): AuthIdentity => authServices?.auth.identity() ?? {
    kind: 'provisional', userId: null, isAnonymous: true, generation: 0, ready: false,
  };
  const analytics = options.analyticsFactory(getIdentity);
  const sdk = options.sdk ?? nativeAdaptySdk;
  const subscription = new AdaptySubscriptionAdapter({
    sdk, publicSdkKey: options.adaptyPublicKey, getIdentity,
    waitForIdentityReady: () => {
      if (!authServices) throw new Error('Identity services not initialized');
      return authServices.waitForIdentityReady();
    },
    runIdentityOperation: (operation) => {
      if (!authServices) throw new Error('Identity services not initialized');
      return authServices.runIdentityOperation(operation);
    },
    getPosthogDistinctId: () => analytics.getDistinctId(),
    openSubscriptionManagement: () => Linking.openURL('https://apps.apple.com/account/subscriptions'),
  });
  try {
    authServices = createAuthServices({
      ...options.config,
      analyticsIdentify: (id) => analytics.identify(id), analyticsReset: () => analytics.reset(),
      subscriptionIdentify: (id) => subscription.identify(id), subscriptionReset: () => subscription.reset(),
      getPosthogDistinctId: () => analytics.getDistinctId(),
      setIntegrationIdentifier: (key, value) => sdk.setIntegrationIdentifier(key, value),
      onBeforeDelete: options.beforeDelete,
    });
  } catch (error) { subscription.dispose(); analytics.dispose(); throw error; }
  let disposed = false;
  return {
    auth: authServices.auth, subscription, analytics,
    boot: () => authServices!.auth.boot(),
    waitForIdentityReady: authServices.waitForIdentityReady,
    runIdentityOperation: authServices.runIdentityOperation,
    dispose() {
      if (disposed) return;
      disposed = true; authServices!.dispose(); subscription.dispose(); analytics.dispose();
    },
  };
}
