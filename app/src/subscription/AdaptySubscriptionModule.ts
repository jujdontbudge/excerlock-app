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
import { adaptyPaywallConfig } from "./adaptyPaywall";

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

const INITIAL_SNAPSHOT: SubscriptionSnapshot = Object.freeze({
  entitlement: Object.freeze({ status: "inactive" }),
  paywall: Object.freeze({ status: "idle" }),
  intent: Object.freeze({ status: "idle", error: null }),
});

export class AdaptySubscriptionModule implements SubscriptionModule {
  private snapshot = INITIAL_SNAPSHOT;
  private readonly listeners = new Set<SubscriptionStateListener>();
  private readonly products = new Map<string, AdaptyPaywallProduct>();
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

  /** Post-purchase Clerk handoff; activation itself deliberately stays anonymous. */
  public async identifyCustomer(customerUserId: string): Promise<void> {
    await this.ready;
    await this.sdk.identify(customerUserId);
  }

  public async loadPaywall(placement: PaywallPlacement): Promise<void> {
    this.publish({
      ...this.snapshot,
      paywall: Object.freeze({ status: "loading", placement }),
    });
    await this.ready;
    try {
      const flow = await this.sdk.getFlow(placement);
      const products = await this.sdk.getPaywallProducts(flow);
      this.products.clear();
      products.forEach((product) => {
        this.products.set(product.vendorProductId, product);
      });
      this.publish({
        ...this.snapshot,
        paywall: Object.freeze({
          status: "ready",
          paywall: adaptyPaywallConfig(placement, flow, products),
        }),
      });
      void this.sdk.logShowFlow(flow).catch(() => {
        // Adapty flow measurement is best-effort and never blocks the paywall.
      });
    } catch {
      const error = subscriptionError(
        "paywall_load_failed",
        "Plans are temporarily unavailable.",
      );
      this.publish({
        ...this.snapshot,
        paywall: Object.freeze({ status: "error", placement, error }),
      });
    }
  }

  public async purchase(productId: string): Promise<PurchaseResult> {
    await this.ready;
    const product = this.products.get(productId);
    if (product === undefined) {
      throw new Error("A loaded paywall product is required for purchase");
    }
    this.publish({
      ...this.snapshot,
      intent: Object.freeze({ status: "purchasing", error: null }),
    });
    try {
      const result = await this.sdk.makePurchase(product);
      if (result.type === "user_cancelled") {
        this.publishIdleIntent();
        return Object.freeze({ status: "cancelled" });
      }
      if (result.type !== "success") {
        return this.purchaseFailure("Purchase is pending approval.");
      }
      const entitlement = entitlementFromProfile(result.profile);
      if (entitlement.status !== "active") {
        return this.purchaseFailure("Premium access was not activated.");
      }
      this.publish({
        ...this.snapshot,
        entitlement,
        intent: Object.freeze({ status: "idle", error: null }),
      });
      return Object.freeze({ status: "purchased", entitlement });
    } catch {
      return this.purchaseFailure("The purchase could not be completed.");
    }
  }

  public async restore(): Promise<RestoreResult> {
    await this.ready;
    this.publish({
      ...this.snapshot,
      intent: Object.freeze({ status: "restoring", error: null }),
    });
    try {
      const entitlement = entitlementFromProfile(
        await this.sdk.restorePurchases(),
      );
      if (entitlement.status !== "active") {
        const error = subscriptionError(
          "no_previous_purchase",
          "No previous purchase was found.",
        );
        this.publish({
          ...this.snapshot,
          entitlement,
          intent: Object.freeze({ status: "idle", error }),
        });
        return Object.freeze({ status: "notFound", error });
      }
      this.publish({
        ...this.snapshot,
        entitlement,
        intent: Object.freeze({ status: "idle", error: null }),
      });
      return Object.freeze({ status: "restored", entitlement });
    } catch {
      const error = subscriptionError(
        "restore_failed",
        "The restore could not be completed.",
      );
      this.publish({
        ...this.snapshot,
        intent: Object.freeze({ status: "idle", error }),
      });
      return Object.freeze({ status: "failed", error });
    }
  }

  public subscribe(
    listener: SubscriptionStateListener,
  ): SubscriptionUnsubscribe {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private publishEntitlement(profile: AdaptyProfile): void {
    this.publish({
      ...this.snapshot,
      entitlement: entitlementFromProfile(profile),
    });
  }

  private publishIdleIntent(): void {
    this.publish({
      ...this.snapshot,
      intent: Object.freeze({ status: "idle", error: null }),
    });
  }

  private purchaseFailure(message: string): PurchaseResult {
    const error = subscriptionError("purchase_failed", message);
    this.publish({
      ...this.snapshot,
      intent: Object.freeze({ status: "idle", error }),
    });
    return Object.freeze({ status: "failed", error });
  }

  private publish(snapshot: SubscriptionSnapshot): void {
    this.snapshot = Object.freeze(snapshot);
    this.listeners.forEach((listener) => listener(this.snapshot));
  }
}

function entitlementFromProfile(
  profile: AdaptyProfile,
): SubscriptionSnapshot["entitlement"] {
  const access = profile.accessLevels?.premium;
  return access?.isActive === true
    ? activeEntitlement(access)
    : Object.freeze({ status: "inactive" as const });
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
