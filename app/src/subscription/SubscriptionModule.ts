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

export type SubscriptionError = Readonly<{
  code: "purchase_failed" | "restore_failed" | "no_previous_purchase";
  message: string;
}>;

export type SubscriptionIntentState =
  | Readonly<{ status: "idle"; error: SubscriptionError | null }>
  | Readonly<{ status: "purchasing"; error: null }>
  | Readonly<{ status: "restoring"; error: null }>;

export type SubscriptionPaywallState =
  | Readonly<{ status: "idle" }>
  | Readonly<{ status: "loading"; placement: PaywallPlacement }>
  | Readonly<{ status: "ready"; paywall: SubscriptionPaywall }>;

export type SubscriptionSnapshot = Readonly<{
  entitlement: PremiumEntitlement;
  paywall: SubscriptionPaywallState;
  intent: SubscriptionIntentState;
}>;

export type PurchaseResult =
  | Readonly<{ status: "purchased"; entitlement: PremiumEntitlement }>
  | Readonly<{ status: "cancelled" }>
  | Readonly<{ status: "failed"; error: SubscriptionError }>;

export type SubscriptionStateListener = (
  snapshot: SubscriptionSnapshot,
) => void;
export type SubscriptionUnsubscribe = () => void;

export interface SubscriptionModule {
  getSnapshot(): Promise<SubscriptionSnapshot>;
  loadPaywall(placement: PaywallPlacement): Promise<void>;
  purchase(productId: string): Promise<PurchaseResult>;
  subscribe(listener: SubscriptionStateListener): SubscriptionUnsubscribe;
}
