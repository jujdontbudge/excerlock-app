import { adapty, type GetPlacementParamsInput } from 'react-native-adapty';
import type { AdaptySdkPort } from './adaptySdk';

/** SDK4 concrete binding: custom native paywall, never the obsolete paywall API. */
export const nativeAdaptySdk: AdaptySdkPort = {
  activate: (key, options) => adapty.activate(key, options),
  // The bridge evaluates both platform branches before `Platform.select`, so the
  // Android key is required even on iOS; it repeats the basename the config
  // plugin would copy there. iOS is the only shipped target and reads `fileName`
  // from the app's main bundle.
  setFallback: ({ ios }) => adapty.setFallback({ ios, android: { relativeAssetPath: ios.fileName } }),
  addEventListener: (event, callback) => adapty.addEventListener(event, callback),
  getProfile: () => adapty.getProfile(),
  identify: (id) => adapty.identify(id),
  logout: () => adapty.logout(),
  getFlow: (placement, options) => {
    if (options.fetchPolicy !== 'reload_revalidating_cache_data') throw new Error('Unsupported paywall fetch policy');
    const params: GetPlacementParamsInput = { fetchPolicy: 'reload_revalidating_cache_data', loadTimeoutMs: options.loadTimeoutMs };
    return adapty.getFlow(placement, params);
  },
  getPaywallProducts: (flow) => adapty.getPaywallProducts(flow),
  logShowFlow: (flow) => adapty.logShowFlow(flow),
  makePurchase: (product) => adapty.makePurchase(product),
  restorePurchases: () => adapty.restorePurchases(),
  setIntegrationIdentifier: (key, value) => adapty.setIntegrationIdentifier(key, value),
};
