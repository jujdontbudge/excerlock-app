import type { PaywallPlacement } from "@excerlock/analytics-events";
import type {
  AdaptyFlow,
  AdaptyPaywallProduct,
  AdaptyProfile,
  AdaptyPurchaseResult,
} from "react-native-adapty";

import type {
  ActivePremiumEntitlement,
  PurchaseResult,
  RestoreResult,
  SubscriptionError,
  SubscriptionModule,
  SubscriptionSnapshot,
  SubscriptionStateListener,
  SubscriptionUnsubscribe,
} from "./SubscriptionModule";

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
  getFlow(placementId: string): Promise<AdaptyFlow>;
  getPaywallProducts(flow: AdaptyFlow): Promise<AdaptyPaywallProduct[]>;
  logShowFlow(flow: AdaptyFlow): Promise<void>;
  makePurchase(product: AdaptyPaywallProduct): Promise<AdaptyPurchaseResult>;
  restorePurchases(): Promise<AdaptyProfile>;
}

const INITIAL_SNAPSHOT: SubscriptionSnapshot = Object.freeze({
  entitlement: Object.freeze({ status: "inactive" }),
  paywall: Object.freeze({ status: "idle" }),
  intent: Object.freeze({ status: "idle", error: null }),
});

export class AdaptySubscriptionModule implements SubscriptionModule {
  private snapshot = INITIAL_SNAPSHOT;
  private readonly listeners = new Set<SubscriptionStateListener>();
  private readonly ready: Promise<void>;

  public constructor(
    apiKey: string,
    private readonly sdk: AdaptySDKPort,
  ) {
    this.ready = this.sdk
      .activate(apiKey, { __ignoreActivationOnFastRefresh: true })
      .then(() => {
        this.sdk.addEventListener("onLatestProfileLoad", (profile) => {
          this.publishEntitlement(profile);
        });
      })
      .catch(() => {
        // Subscription startup is fail-closed: callers stay locked, never crash.
      });
  }

  public async getSnapshot(): Promise<SubscriptionSnapshot> {
    await this.ready;
    try {
      this.publishEntitlement(await this.sdk.getProfile());
    } catch {
      // Cached snapshot remains authoritative when the SDK is unavailable.
    }
    return this.snapshot;
  }

  public async loadPaywall(placement: PaywallPlacement): Promise<void> {
    const error = subscriptionError(
      "paywall_load_failed",
      "Plans are temporarily unavailable.",
    );
    this.publish({
      ...this.snapshot,
      paywall: Object.freeze({ status: "error", placement, error }),
    });
  }

  public async purchase(_productId: string): Promise<PurchaseResult> {
    const error = subscriptionError(
      "purchase_failed",
      "Purchases are temporarily unavailable.",
    );
    return Object.freeze({ status: "failed", error });
  }

  public async restore(): Promise<RestoreResult> {
    const error = subscriptionError(
      "restore_failed",
      "Restore is temporarily unavailable.",
    );
    return Object.freeze({ status: "failed", error });
  }

  public subscribe(
    listener: SubscriptionStateListener,
  ): SubscriptionUnsubscribe {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private publishEntitlement(profile: AdaptyProfile): void {
    const access = profile.accessLevels?.premium;
    const entitlement: SubscriptionSnapshot["entitlement"] =
      access?.isActive === true
        ? activeEntitlement(access)
        : Object.freeze({ status: "inactive" as const });
    this.publish({ ...this.snapshot, entitlement });
  }

  private publish(snapshot: SubscriptionSnapshot): void {
    this.snapshot = Object.freeze(snapshot);
    this.listeners.forEach((listener) => listener(this.snapshot));
  }
}

function activeEntitlement(
  access: NonNullable<AdaptyProfile["accessLevels"]>[string],
): ActivePremiumEntitlement {
  return Object.freeze({
    status: "active",
    productId: access.vendorProductId,
    purchasedAtMs: (access.startsAt ?? access.activatedAt).getTime(),
    renewsAtMs: access.expiresAt?.getTime() ?? Number.MAX_SAFE_INTEGER,
  });
}

function subscriptionError(
  code: SubscriptionError["code"],
  message: string,
): SubscriptionError {
  return Object.freeze({ code, message });
}
