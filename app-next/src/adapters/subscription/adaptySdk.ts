import type {
  AdaptyFlow,
  AdaptyPaywallProduct,
  AdaptyProfile,
  FileLocation,
  FlowEventHandlers,
} from 'react-native-adapty';

/** The presented Paywall Builder view, narrowed to what the adapter drives. */
export type AdaptyFlowView = {
  present(): Promise<void>;
  dismiss(): Promise<void>;
  setEventHandlers(handlers: Partial<FlowEventHandlers>): () => void;
};

/**
 * The slice of `react-native-adapty` the adapter uses. Vendor types stop here: nothing above this
 * interface names an Adapty method, and tests replace the whole SDK rather than the native module.
 */
export interface AdaptySdk {
  activate(apiKey: string): Promise<void>;
  onProfileLoad(callback: (profile: AdaptyProfile) => void): { remove(): void };
  getProfile(): Promise<AdaptyProfile>;
  identify(userId: string): Promise<void>;
  logout(): Promise<void>;
  getFlow(placement: string, loadTimeoutMs: number): Promise<AdaptyFlow>;
  getProducts(flow: AdaptyFlow): Promise<AdaptyPaywallProduct[]>;
  createFlowView(flow: AdaptyFlow, customTags: Record<string, string>): Promise<AdaptyFlowView>;
  logShow(flow: AdaptyFlow): Promise<void>;
  restorePurchases(): Promise<AdaptyProfile>;
  setFallback(location: FileLocation): Promise<void>;
}
