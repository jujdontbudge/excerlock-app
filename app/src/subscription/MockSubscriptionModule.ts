import type { PaywallPlacement } from "@excerlock/analytics-events";

import { FALLBACK_ONBOARDING_PAYWALL } from "./fallbackPaywall";
import type {
  SubscriptionModule,
  SubscriptionSnapshot,
  SubscriptionStateListener,
  SubscriptionUnsubscribe,
} from "./SubscriptionModule";

const INITIAL_SNAPSHOT: SubscriptionSnapshot = Object.freeze({
  entitlement: Object.freeze({ status: "inactive" }),
  paywall: Object.freeze({ status: "idle" }),
});

export class MockSubscriptionModule implements SubscriptionModule {
  private snapshot = INITIAL_SNAPSHOT;
  private readonly listeners = new Set<SubscriptionStateListener>();

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
