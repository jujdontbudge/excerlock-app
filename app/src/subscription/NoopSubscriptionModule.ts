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
import { subscriptionError } from "./subscriptionError";
import { SubscriptionSnapshotStore } from "./subscriptionSnapshotStore";

/** Keyless-build adapter: always locked, always recoverable, never throws. */
export class NoopSubscriptionModule implements SubscriptionModule {
  private readonly state = new SubscriptionSnapshotStore();

  public async getSnapshot(): Promise<SubscriptionSnapshot> {
    return this.state.current;
  }

  public async loadPaywall(placement: PaywallPlacement): Promise<void> {
    const error = unavailable("paywall_load_failed");
    this.state.publish({
      ...this.state.current,
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
    return this.state.subscribe(listener);
  }
}

function unavailable(code: SubscriptionError["code"]): SubscriptionError {
  return subscriptionError(code, "Subscriptions are unavailable in this build.");
}
