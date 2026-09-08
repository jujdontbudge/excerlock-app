import { adapty, createFlowView } from 'react-native-adapty';
import type { AdaptyFlow } from 'react-native-adapty';
import { AdaptySdk } from './adaptySdk';

/**
 * Binds the narrow port to the real SDK. The only file in the app that imports `react-native-adapty`
 * for its behaviour rather than its types, so every other module stays testable without the native side.
 *
 * `__ignoreActivationOnFastRefresh` keeps Fast Refresh from re-activating during development.
 */
export function nativeAdaptySdk(): AdaptySdk {
  return {
    activate: (apiKey) => adapty.activate(apiKey, { __ignoreActivationOnFastRefresh: true }),
    onProfileLoad: (callback) => adapty.addEventListener('onLatestProfileLoad', callback),
    getProfile: () => adapty.getProfile(),
    identify: (userId) => adapty.identify(userId),
    logout: () => adapty.logout(),
    getFlow: (placement, loadTimeoutMs) => adapty.getFlow(placement, { loadTimeoutMs }),
    getProducts: (flow: AdaptyFlow) => adapty.getPaywallProducts(flow),
    createFlowView: (flow, customTags) => createFlowView(flow, { customTags, prefetchProducts: true }),
    logShow: (flow: AdaptyFlow) => adapty.logShowFlow(flow),
    restorePurchases: () => adapty.restorePurchases(),
    setFallback: (location) => adapty.setFallback(location),
  };
}
