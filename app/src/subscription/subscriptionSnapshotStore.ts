import type {
  SubscriptionSnapshot,
  SubscriptionStateListener,
  SubscriptionUnsubscribe,
} from "./SubscriptionModule";

const INITIAL_SNAPSHOT: SubscriptionSnapshot = Object.freeze({
  entitlement: Object.freeze({ status: "inactive" }),
  paywall: Object.freeze({ status: "idle" }),
  intent: Object.freeze({ status: "idle", error: null }),
});

/** Shared synchronous snapshot broadcaster for subscription adapters. */
export class SubscriptionSnapshotStore {
  private snapshot = INITIAL_SNAPSHOT;
  private readonly listeners = new Set<SubscriptionStateListener>();

  public get current(): SubscriptionSnapshot {
    return this.snapshot;
  }

  public publish(snapshot: SubscriptionSnapshot): void {
    this.snapshot = Object.freeze(snapshot);
    this.listeners.forEach((listener) => listener(this.snapshot));
  }

  public subscribe(
    listener: SubscriptionStateListener,
  ): SubscriptionUnsubscribe {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}
