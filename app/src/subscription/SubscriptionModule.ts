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

export type SubscriptionPaywallConfig = Readonly<{
  placement: PaywallPlacement;
  title: string;
  body: string;
  valueStatement: string;
  products: readonly SubscriptionProduct[];
}>;

export type ActivePremiumEntitlement = Readonly<{
  status: "active";
  productId: string;
  purchasedAtMs: number;
  renewsAtMs: number;
}>;

export type PremiumEntitlement =
  | Readonly<{ status: "inactive" }>
  | ActivePremiumEntitlement;

export type SubscriptionError = Readonly<{
  code:
    | "paywall_load_failed"
    | "purchase_failed"
    | "restore_failed"
    | "no_previous_purchase";
  message: string;
}>;

export type SubscriptionIntentState =
  | Readonly<{ status: "idle"; error: SubscriptionError | null }>
  | Readonly<{ status: "purchasing"; error: null }>
  | Readonly<{ status: "restoring"; error: null }>;

export type SubscriptionPaywallState =
  | Readonly<{ status: "idle" }>
  | Readonly<{ status: "loading"; placement: PaywallPlacement }>
  | Readonly<{
      status: "error";
      placement: PaywallPlacement;
      error: SubscriptionError;
    }>
  | Readonly<{ status: "ready"; paywall: SubscriptionPaywallConfig }>;

export type SubscriptionSnapshot = Readonly<{
  entitlement: PremiumEntitlement;
  paywall: SubscriptionPaywallState;
  intent: SubscriptionIntentState;
}>;

export type PurchaseResult =
  | Readonly<{ status: "purchased"; entitlement: ActivePremiumEntitlement }>
  | Readonly<{ status: "cancelled" }>
  | Readonly<{ status: "failed"; error: SubscriptionError }>;

export type RestoreResult =
  | Readonly<{ status: "restored"; entitlement: ActivePremiumEntitlement }>
  | Readonly<{ status: "notFound"; error: SubscriptionError }>
  | Readonly<{ status: "failed"; error: SubscriptionError }>;

export type SubscriptionStateListener = (
  snapshot: SubscriptionSnapshot,
) => void;
export type SubscriptionUnsubscribe = () => void;

export interface SubscriptionModule {
  getSnapshot(): Promise<SubscriptionSnapshot>;
  loadPaywall(placement: PaywallPlacement): Promise<void>;
  purchase(productId: string): Promise<PurchaseResult>;
  restore(): Promise<RestoreResult>;
  subscribe(listener: SubscriptionStateListener): SubscriptionUnsubscribe;
}
