import type { PaywallPlacement } from "@excerlock/analytics-events";

export type SubscriptionProduct = Readonly<{
  id: string;
  title: string;
  price: string;
  detail: string;
  badge: string | null;
  trialDays: number;
  durationDays: number;
  isDefault: boolean;
}>;

export type SubscriptionPaywall = Readonly<{
  placement: PaywallPlacement;
  title: string;
  body: string;
  products: readonly SubscriptionProduct[];
}>;

export type PremiumEntitlement =
  | Readonly<{ status: "inactive" }>
  | Readonly<{
      status: "active";
      productId: string;
      purchasedAtMs: number;
      renewsAtMs: number;
    }>;

export type SubscriptionPaywallState =
  | Readonly<{ status: "idle" }>
  | Readonly<{ status: "loading"; placement: PaywallPlacement }>
  | Readonly<{ status: "ready"; paywall: SubscriptionPaywall }>;

export type SubscriptionSnapshot = Readonly<{
  entitlement: PremiumEntitlement;
  paywall: SubscriptionPaywallState;
}>;

export type SubscriptionStateListener = (
  snapshot: SubscriptionSnapshot,
) => void;
export type SubscriptionUnsubscribe = () => void;

export interface SubscriptionModule {
  getSnapshot(): Promise<SubscriptionSnapshot>;
  loadPaywall(placement: PaywallPlacement): Promise<void>;
  subscribe(listener: SubscriptionStateListener): SubscriptionUnsubscribe;
}
