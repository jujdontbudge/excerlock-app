import type {
  AdaptyFlow,
  AdaptyPaywallProduct,
  AdaptyProfile,
  AdaptyPurchaseResult,
} from "react-native-adapty";

/** Narrow SDK surface consumed by the vendor adapter and replaced in tests. */
export interface AdaptySDKPort {
  activate(
    apiKey: string,
    params: Readonly<{ __ignoreActivationOnFastRefresh: true }>,
  ): Promise<void>;
  addEventListener(
    event: "onLatestProfileLoad",
    callback: (profile: AdaptyProfile) => void,
  ): Readonly<{ remove(): void }>;
  getProfile(): Promise<AdaptyProfile>;
  identify(customerUserId: string): Promise<void>;
  getFlow(placementId: string): Promise<AdaptyFlow>;
  getPaywallProducts(flow: AdaptyFlow): Promise<AdaptyPaywallProduct[]>;
  logShowFlow(flow: AdaptyFlow): Promise<void>;
  makePurchase(product: AdaptyPaywallProduct): Promise<AdaptyPurchaseResult>;
  restorePurchases(): Promise<AdaptyProfile>;
}
