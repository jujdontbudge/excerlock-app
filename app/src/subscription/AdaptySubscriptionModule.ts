import type { PaywallPlacement } from "@excerlock/analytics-events";
import type {
  AdaptyFlow,
  AdaptyPaywallProduct,
  AdaptyProfile,
} from "react-native-adapty";

import { entitlementFromAdaptyProfile } from "./adaptyEntitlement";
import type { AdaptySDKPort } from "./adaptySDK";
import type {
  PurchaseResult,
  RestoreResult,
  SubscriptionModule,
  SubscriptionSnapshot,
  SubscriptionStateListener,
  SubscriptionUnsubscribe,
} from "./SubscriptionModule";
import { adaptyPaywallConfig } from "./adaptyPaywall";
import { subscriptionError } from "./subscriptionError";
import { SubscriptionSnapshotStore } from "./subscriptionSnapshotStore";

export class AdaptySubscriptionModule implements SubscriptionModule {
  private readonly state = new SubscriptionSnapshotStore();
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
    return this.state.current;
  }

  /** Post-purchase Clerk handoff; activation itself deliberately stays anonymous. */
  public async identifyCustomer(customerUserId: string): Promise<void> {
    await this.ready;
    await this.sdk.identify(customerUserId);
  }

  public async loadPaywall(placement: PaywallPlacement): Promise<void> {
    this.state.publish({
      ...this.state.current,
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
      this.state.publish({
        ...this.state.current,
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
      this.state.publish({
        ...this.state.current,
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
    this.state.publish({
      ...this.state.current,
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
      const entitlement = entitlementFromAdaptyProfile(result.profile);
      if (entitlement.status !== "active") {
        return this.purchaseFailure("Premium access was not activated.");
      }
      this.state.publish({
        ...this.state.current,
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
    this.state.publish({
      ...this.state.current,
      intent: Object.freeze({ status: "restoring", error: null }),
    });
    try {
      const entitlement = entitlementFromAdaptyProfile(
        await this.sdk.restorePurchases(),
      );
      if (entitlement.status !== "active") {
        const error = subscriptionError(
          "no_previous_purchase",
          "No previous purchase was found.",
        );
        this.state.publish({
          ...this.state.current,
          entitlement,
          intent: Object.freeze({ status: "idle", error }),
        });
        return Object.freeze({ status: "notFound", error });
      }
      this.state.publish({
        ...this.state.current,
        entitlement,
        intent: Object.freeze({ status: "idle", error: null }),
      });
      return Object.freeze({ status: "restored", entitlement });
    } catch {
      const error = subscriptionError(
        "restore_failed",
        "The restore could not be completed.",
      );
      this.state.publish({
        ...this.state.current,
        intent: Object.freeze({ status: "idle", error }),
      });
      return Object.freeze({ status: "failed", error });
    }
  }

  public subscribe(
    listener: SubscriptionStateListener,
  ): SubscriptionUnsubscribe {
    return this.state.subscribe(listener);
  }

  private publishEntitlement(profile: AdaptyProfile): void {
    this.state.publish({
      ...this.state.current,
      entitlement: entitlementFromAdaptyProfile(profile),
    });
  }

  private publishIdleIntent(): void {
    this.state.publish({
      ...this.state.current,
      intent: Object.freeze({ status: "idle", error: null }),
    });
  }

  private purchaseFailure(message: string): PurchaseResult {
    const error = subscriptionError("purchase_failed", message);
    this.state.publish({
      ...this.state.current,
      intent: Object.freeze({ status: "idle", error }),
    });
    return Object.freeze({ status: "failed", error });
  }

}
