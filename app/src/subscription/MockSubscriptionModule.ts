import type { PaywallPlacement } from "@excerlock/analytics-events";

import {
  SystemSubscriptionClock,
  type SubscriptionClock,
} from "./clock";
import { FALLBACK_ONBOARDING_PAYWALL } from "./fallbackPaywall";
import type {
  PremiumEntitlement,
  PurchaseResult,
  SubscriptionModule,
  SubscriptionSnapshot,
  SubscriptionStateListener,
  SubscriptionUnsubscribe,
} from "./SubscriptionModule";

const MS_PER_DAY = 24 * 60 * 60 * 1_000;

const INITIAL_SNAPSHOT: SubscriptionSnapshot = Object.freeze({
  entitlement: Object.freeze({ status: "inactive" }),
  paywall: Object.freeze({ status: "idle" }),
  intent: Object.freeze({ status: "idle", error: null }),
});

type MockSubscriptionModuleOptions = Readonly<{
  clock?: SubscriptionClock;
}>;

export class MockSubscriptionModule implements SubscriptionModule {
  private readonly clock: SubscriptionClock;
  private snapshot = INITIAL_SNAPSHOT;
  private nextPurchaseResult: "purchased" | "cancelled" = "purchased";
  private readonly listeners = new Set<SubscriptionStateListener>();

  public constructor(options: MockSubscriptionModuleOptions = {}) {
    this.clock = options.clock ?? new SystemSubscriptionClock();
  }

  public async getSnapshot(): Promise<SubscriptionSnapshot> {
    return this.snapshot;
  }

  public async loadPaywall(placement: PaywallPlacement): Promise<void> {
    this.publish({
      ...this.snapshot,
      paywall: Object.freeze({ status: "loading", placement }),
    });
    await Promise.resolve();
    this.publish({
      ...this.snapshot,
      paywall: Object.freeze({
        status: "ready",
        paywall: FALLBACK_ONBOARDING_PAYWALL,
      }),
    });
  }

  public async purchase(productId: string): Promise<PurchaseResult> {
    const paywall =
      this.snapshot.paywall.status === "ready"
        ? this.snapshot.paywall.paywall
        : null;
    const product = paywall?.products.find(
      (candidate) => candidate.id === productId,
    );
    if (product === undefined) {
      throw new Error("A loaded paywall product is required for purchase");
    }

    this.publish({
      ...this.snapshot,
      intent: Object.freeze({ status: "purchasing", error: null }),
    });
    await Promise.resolve();

    if (this.nextPurchaseResult === "cancelled") {
      this.publish({
        ...this.snapshot,
        intent: Object.freeze({ status: "idle", error: null }),
      });
      return Object.freeze({ status: "cancelled" });
    }

    const purchasedAtMs = this.clock.nowMs();
    const entitlement: PremiumEntitlement = Object.freeze({
      status: "active",
      productId,
      purchasedAtMs,
      renewsAtMs: purchasedAtMs + product.durationDays * MS_PER_DAY,
    });
    this.publish({
      ...this.snapshot,
      entitlement,
      intent: Object.freeze({ status: "idle", error: null }),
    });
    return Object.freeze({ status: "purchased", entitlement });
  }

  /** Deterministic mock driver; not part of the app-facing interface. */
  public setNextPurchaseResult(result: "purchased" | "cancelled"): void {
    this.nextPurchaseResult = result;
  }

  public subscribe(
    listener: SubscriptionStateListener,
  ): SubscriptionUnsubscribe {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private publish(snapshot: SubscriptionSnapshot): void {
    this.snapshot = Object.freeze(snapshot);
    this.listeners.forEach((listener) => listener(this.snapshot));
  }
}
