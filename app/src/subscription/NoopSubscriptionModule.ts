import type { PaywallPlacement } from "@excerlock/analytics-events";

import type {
  PurchaseResult,
  RestoreResult,
  SubscriptionError,
  SubscriptionModule,
  SubscriptionSnapshot,
  SubscriptionStateListener,
  SubscriptionUnsubscribe,
} from "./SubscriptionModule";

const INITIAL_SNAPSHOT: SubscriptionSnapshot = Object.freeze({
  entitlement: Object.freeze({ status: "inactive" }),
  paywall: Object.freeze({ status: "idle" }),
  intent: Object.freeze({ status: "idle", error: null }),
});

/** Keyless-build adapter: always locked, always recoverable, never throws. */
export class NoopSubscriptionModule implements SubscriptionModule {
  private snapshot = INITIAL_SNAPSHOT;
  private readonly listeners = new Set<SubscriptionStateListener>();

  public async getSnapshot(): Promise<SubscriptionSnapshot> {
    return this.snapshot;
  }

  public async loadPaywall(placement: PaywallPlacement): Promise<void> {
    const error = unavailable("paywall_load_failed");
    this.publish({
      ...this.snapshot,
      paywall: Object.freeze({ status: "error", placement, error }),
    });
  }

  public async purchase(_productId: string): Promise<PurchaseResult> {
    return Object.freeze({
      status: "failed",
      error: unavailable("purchase_failed"),
    });
  }

  public async restore(): Promise<RestoreResult> {
    return Object.freeze({
      status: "failed",
      error: unavailable("restore_failed"),
    });
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

function unavailable(code: SubscriptionError["code"]): SubscriptionError {
  return Object.freeze({
    code,
    message: "Subscriptions are unavailable in this build.",
  });
}
