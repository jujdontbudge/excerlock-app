import type { PaywallPlacement } from "@excerlock/analytics-events";
import type { StateStorage } from "zustand/middleware";

import {
  SystemSubscriptionClock,
  type SubscriptionClock,
} from "./clock";
import { FALLBACK_ONBOARDING_PAYWALL } from "./fallbackPaywall";
import { createMockSubscriptionPersistence } from "./mockStore";
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

const MS_PER_DAY = 24 * 60 * 60 * 1_000;

const INITIAL_SNAPSHOT: SubscriptionSnapshot = Object.freeze({
  entitlement: Object.freeze({ status: "inactive" }),
  paywall: Object.freeze({ status: "idle" }),
  intent: Object.freeze({ status: "idle", error: null }),
});

type MockSubscriptionModuleOptions = Readonly<{
  clock?: SubscriptionClock;
  storage?: StateStorage<Promise<void>>;
}>;

type MockPurchaseResult =
  | "purchased"
  | "cancelled"
  | Readonly<{ status: "failed"; message: string }>;

type MockPaywallResult =
  | "ready"
  | Readonly<{ status: "failed"; message: string }>;

type MockRestoreResult =
  | Readonly<{
      status: "restored";
      entitlement: ActivePremiumEntitlement;
    }>
  | Readonly<{ status: "notFound" }>
  | Readonly<{ status: "failed"; message: string }>;

export class MockSubscriptionModule implements SubscriptionModule {
  private readonly clock: SubscriptionClock;
  private readonly persistence: ReturnType<
    typeof createMockSubscriptionPersistence
  >;
  private readonly ready: Promise<void>;
  private snapshot = INITIAL_SNAPSHOT;
  private nextPaywallResult: MockPaywallResult = "ready";
  private nextPurchaseResult: MockPurchaseResult = "purchased";
  private nextRestoreResult: MockRestoreResult = Object.freeze({
    status: "notFound",
  });
  private readonly listeners = new Set<SubscriptionStateListener>();

  public constructor(options: MockSubscriptionModuleOptions = {}) {
    this.clock = options.clock ?? new SystemSubscriptionClock();
    this.persistence = createMockSubscriptionPersistence(options.storage);
    this.ready = this.persistence.rehydrate().then(() => {
      this.snapshot = Object.freeze({
        ...this.snapshot,
        entitlement: this.persistence.getState().entitlement,
      });
    });
  }

  public async getSnapshot(): Promise<SubscriptionSnapshot> {
    await this.ready;
    await this.expireEntitlementIfNeeded();
    return this.snapshot;
  }

  public async loadPaywall(placement: PaywallPlacement): Promise<void> {
    await this.ready;
    this.publish({
      ...this.snapshot,
      paywall: Object.freeze({ status: "loading", placement }),
    });
    await Promise.resolve();
    if (typeof this.nextPaywallResult === "object") {
      const error: SubscriptionError = Object.freeze({
        code: "paywall_load_failed",
        message: this.nextPaywallResult.message,
      });
      this.publish({
        ...this.snapshot,
        paywall: Object.freeze({
          status: "error",
          placement,
          error,
        }),
      });
      return;
    }

    this.publish({
      ...this.snapshot,
      paywall: Object.freeze({
        status: "ready",
        paywall: Object.freeze({
          ...FALLBACK_ONBOARDING_PAYWALL,
          placement,
        }),
      }),
    });
  }

  public async purchase(productId: string): Promise<PurchaseResult> {
    await this.ready;
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
    if (typeof this.nextPurchaseResult === "object") {
      const error: SubscriptionError = Object.freeze({
        code: "purchase_failed",
        message: this.nextPurchaseResult.message,
      });
      this.publish({
        ...this.snapshot,
        intent: Object.freeze({ status: "idle", error }),
      });
      return Object.freeze({ status: "failed", error });
    }

    const purchasedAtMs = this.clock.nowMs();
    const entitlement: ActivePremiumEntitlement = Object.freeze({
      status: "active",
      productId,
      purchasedAtMs,
      renewsAtMs: purchasedAtMs + product.durationDays * MS_PER_DAY,
    });
    await this.persistence.update({ entitlement });
    this.publish({
      ...this.snapshot,
      entitlement,
      intent: Object.freeze({ status: "idle", error: null }),
    });
    return Object.freeze({ status: "purchased", entitlement });
  }

  public async restore(): Promise<RestoreResult> {
    await this.ready;
    this.publish({
      ...this.snapshot,
      intent: Object.freeze({ status: "restoring", error: null }),
    });
    await Promise.resolve();

    if (this.nextRestoreResult.status === "restored") {
      const entitlement = Object.freeze({
        ...this.nextRestoreResult.entitlement,
      });
      await this.persistence.update({ entitlement });
      this.publish({
        ...this.snapshot,
        entitlement,
        intent: Object.freeze({ status: "idle", error: null }),
      });
      return Object.freeze({ status: "restored", entitlement });
    }

    const error: SubscriptionError = Object.freeze({
      code:
        this.nextRestoreResult.status === "notFound"
          ? "no_previous_purchase"
          : "restore_failed",
      message:
        this.nextRestoreResult.status === "notFound"
          ? "No previous purchase was found."
          : this.nextRestoreResult.message,
    });
    this.publish({
      ...this.snapshot,
      intent: Object.freeze({ status: "idle", error }),
    });
    return Object.freeze({
      status:
        this.nextRestoreResult.status === "notFound" ? "notFound" : "failed",
      error,
    });
  }

  /** Deterministic mock driver; not part of the app-facing interface. */
  public setNextPaywallResult(result: MockPaywallResult): void {
    this.nextPaywallResult = result;
  }

  /** Deterministic mock driver; not part of the app-facing interface. */
  public setNextPurchaseResult(result: MockPurchaseResult): void {
    this.nextPurchaseResult = result;
  }

  /** Deterministic mock driver; not part of the app-facing interface. */
  public setNextRestoreResult(result: MockRestoreResult): void {
    this.nextRestoreResult = result;
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

  private async expireEntitlementIfNeeded(): Promise<void> {
    if (
      this.snapshot.entitlement.status !== "active" ||
      this.snapshot.entitlement.renewsAtMs > this.clock.nowMs()
    ) {
      return;
    }

    const entitlement = Object.freeze({ status: "inactive" as const });
    await this.persistence.update({ entitlement });
    this.publish({ ...this.snapshot, entitlement });
  }
}
