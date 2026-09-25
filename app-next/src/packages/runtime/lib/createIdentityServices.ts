import { Linking } from 'react-native';
import type { AuthIdentity } from '../../ports/AuthPort';
import { createAuthServices, type AuthServiceConfig, type AuthServices } from '../../identity/createAuthServices';
import { AdaptySubscriptionAdapter } from '../../subscription/AdaptySubscriptionAdapter';
import { nativeAdaptySdk } from '../../subscription/nativeAdaptySdk';
import type { AdaptySdkPort } from '../../subscription/adaptySdk';
import { RuntimeCleanupError } from '../../platform/RuntimeSingleton';

type AnalyticsIdentityHooks = {
  identify(id: string): Promise<void>;
  reset(): Promise<void>;
  getDistinctId(): string | null;
  replayPendingScreens(): void;
  dispose(): void | Promise<void>;
};
export async function createIdentityServices(options: {
  config: Pick<AuthServiceConfig, 'supabaseUrl' | 'supabaseAnonKey' | 'apiBaseUrl' | 'googleIosClientId' | 'googleRedirectUri'>;
  adaptyPublicKey: string;
  reportError(error: unknown): void;
  analyticsFactory(getIdentity: () => AuthIdentity): AnalyticsIdentityHooks;
  beforeDelete(): Promise<void>;
  afterDelete(): Promise<void>;
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
    reportError: options.reportError,
    openSubscriptionManagement: () => Linking.openURL('https://apps.apple.com/account/subscriptions'),
  });
  try {
    authServices = await createAuthServices({
      ...options.config,
      analyticsIdentify: (id) => analytics.identify(id), analyticsReset: () => analytics.reset(),
      subscriptionIdentify: (id) => subscription.identify(id), subscriptionReset: () => subscription.reset(),
      getPosthogDistinctId: () => analytics.getDistinctId(),
      setIntegrationIdentifier: (key, value) => sdk.setIntegrationIdentifier(key, value),
      onBeforeDelete: options.beforeDelete,
      onAfterDelete: options.afterDelete,
    });
  } catch (error) {
    const cleanup = await Promise.allSettled([
      Promise.resolve().then(() => subscription.dispose()),
      Promise.resolve().then(() => analytics.dispose()),
    ]);
    const failures = cleanup.filter((result): result is PromiseRejectedResult => result.status === 'rejected');
    if (failures.length) throw new RuntimeCleanupError([error, ...failures.map(({ reason }) => reason)]);
    throw error;
  }
  let disposed = false;
  let disposal: Promise<void> | null = null;
  authServices.auth.subscribeIdentity(() => { analytics.replayPendingScreens(); });
  analytics.replayPendingScreens();
  return {
    auth: authServices.auth, subscription, analytics,
    getAuthContext: () => (disposed ? Promise.resolve(null) : authServices!.auth.getAuthContext()),
    boot: () => authServices!.auth.boot(),
    waitForIdentityReady: authServices.waitForIdentityReady,
    runIdentityOperation: authServices.runIdentityOperation,
    dispose() {
      if (disposal) return disposal;
      disposed = true;
      disposal = (async () => {
        const results = await Promise.allSettled([
          Promise.resolve().then(() => authServices!.dispose()),
          Promise.resolve().then(() => subscription.dispose()),
          Promise.resolve().then(() => analytics.dispose()),
        ]);
        const failures = results.filter((result): result is PromiseRejectedResult => result.status === 'rejected');
        if (failures.length) throw new AggregateError(failures.map(({ reason }) => reason), 'Identity cleanup failed');
      })();
      return disposal;
    },
  };
}
