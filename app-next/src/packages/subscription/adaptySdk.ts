import type { AdaptyFlow, AdaptyPaywallProduct, AdaptyProfile, AdaptyPurchaseResult, AdaptyRemoteConfig } from 'react-native-adapty';
export interface AdaptySdkPort {
  activate(key: string, options: { __ignoreActivationOnFastRefresh: true }): Promise<void>;
  setFallback(location: { ios: { fileName: string } }): Promise<void>;
  addEventListener(event: 'onLatestProfileLoad', callback: (profile: AdaptyProfile) => void): { remove(): void };
  getProfile(): Promise<AdaptyProfile>;
  identify(userId: string): Promise<void>;
  logout(): Promise<void>;
  updateProfile(params: { customAttributes: { onboarding_offer_version: number } }): Promise<unknown>;
  getFlow(placement: string, options: { fetchPolicy: string; loadTimeoutMs: number }): Promise<AdaptyFlow>;
  getPaywallProducts(flow: AdaptyFlow): Promise<AdaptyPaywallProduct[]>;
  logShowFlow(flow: AdaptyFlow): Promise<void>;
  makePurchase(product: AdaptyPaywallProduct): Promise<AdaptyPurchaseResult>;
  restorePurchases(): Promise<AdaptyProfile>;
  setIntegrationIdentifier(key: string, value: string): Promise<void>;
}
export type { AdaptyFlow, AdaptyPaywallProduct, AdaptyProfile, AdaptyPurchaseResult, AdaptyRemoteConfig };
