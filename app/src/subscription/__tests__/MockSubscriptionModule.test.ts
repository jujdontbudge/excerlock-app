jest.mock(
  "@react-native-async-storage/async-storage",
  () => require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);

import AsyncStorage from "@react-native-async-storage/async-storage";

import { MockSubscriptionModule } from "../MockSubscriptionModule";
import type { SubscriptionModule } from "../SubscriptionModule";
import { ManualSubscriptionClock } from "../clock";
import { isPremiumEntitled } from "../entitlement";

describe("MockSubscriptionModule", () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it("loads the ordered onboarding offer while access remains locked", async () => {
    const subscription: SubscriptionModule = new MockSubscriptionModule();
    const observedPaywallStates: string[] = [];
    subscription.subscribe((snapshot) => {
      observedPaywallStates.push(snapshot.paywall.status);
    });

    expect(isPremiumEntitled(await subscription.getSnapshot())).toBe(false);

    await subscription.loadPaywall("onboarding");

    const snapshot = await subscription.getSnapshot();
    expect(observedPaywallStates).toEqual(["loading", "ready"]);
    expect(snapshot.paywall).toMatchObject({
      status: "ready",
      paywall: {
        placement: "onboarding",
        products: [
          {
            id: "excerlock_annual",
            price: "$59.99 / year",
            trialDays: 7,
          },
          {
            id: "excerlock_monthly",
            price: "$9.99 / month",
            trialDays: 0,
          },
        ],
      },
    });
    expect(isPremiumEntitled(snapshot)).toBe(false);
  });

  it("turns a successful purchase intent into premium entitlement", async () => {
    const clock = new ManualSubscriptionClock(1_000);
    const subscription: SubscriptionModule = new MockSubscriptionModule({
      clock,
    });
    const observedIntents: string[] = [];
    subscription.subscribe((snapshot) => {
      observedIntents.push(snapshot.intent.status);
    });
    await subscription.loadPaywall("onboarding");
    observedIntents.length = 0;

    await expect(
      subscription.purchase("excerlock_annual"),
    ).resolves.toMatchObject({ status: "purchased" });

    expect(observedIntents).toEqual(["purchasing", "idle"]);
    const snapshot = await subscription.getSnapshot();
    expect(snapshot.entitlement).toEqual({
      status: "active",
      productId: "excerlock_annual",
      purchasedAtMs: 1_000,
      renewsAtMs: 31_536_001_000,
    });
    expect(snapshot.intent).toEqual({ status: "idle", error: null });
    expect(isPremiumEntitled(snapshot)).toBe(true);
  });

  it("leaves access locked when the user cancels purchase", async () => {
    const mock = new MockSubscriptionModule();
    const subscription: SubscriptionModule = mock;
    await subscription.loadPaywall("onboarding");
    mock.setNextPurchaseResult("cancelled");

    await expect(
      subscription.purchase("excerlock_annual"),
    ).resolves.toEqual({ status: "cancelled" });

    const snapshot = await subscription.getSnapshot();
    expect(snapshot.intent).toEqual({ status: "idle", error: null });
    expect(isPremiumEntitled(snapshot)).toBe(false);
  });

  it("surfaces a failed purchase without granting entitlement", async () => {
    const mock = new MockSubscriptionModule();
    const subscription: SubscriptionModule = mock;
    await subscription.loadPaywall("onboarding");
    mock.setNextPurchaseResult({
      status: "failed",
      message: "The App Store is unavailable.",
    });

    await expect(
      subscription.purchase("excerlock_annual"),
    ).resolves.toEqual({
      status: "failed",
      error: {
        code: "purchase_failed",
        message: "The App Store is unavailable.",
      },
    });

    const snapshot = await subscription.getSnapshot();
    expect(snapshot.intent).toEqual({
      status: "idle",
      error: {
        code: "purchase_failed",
        message: "The App Store is unavailable.",
      },
    });
    expect(isPremiumEntitled(snapshot)).toBe(false);
  });

  it("restores a previous premium entitlement", async () => {
    const mock = new MockSubscriptionModule({
      clock: new ManualSubscriptionClock(1_000),
    });
    const subscription: SubscriptionModule = mock;
    mock.setNextRestoreResult({
      status: "restored",
      entitlement: {
        status: "active",
        productId: "excerlock_annual",
        purchasedAtMs: 500,
        renewsAtMs: 31_536_000_500,
      },
    });
    const observedIntents: string[] = [];
    subscription.subscribe((snapshot) => {
      observedIntents.push(snapshot.intent.status);
    });

    await expect(subscription.restore()).resolves.toMatchObject({
      status: "restored",
      entitlement: { productId: "excerlock_annual" },
    });

    expect(observedIntents).toEqual(["restoring", "idle"]);
    expect(isPremiumEntitled(await subscription.getSnapshot())).toBe(true);
  });

  it("persists entitlement across remount and expires it on the injected clock", async () => {
    const purchasedAtMs = 10_000;
    const renewalAtMs = purchasedAtMs + 30 * 24 * 60 * 60 * 1_000;
    const first = new MockSubscriptionModule({
      clock: new ManualSubscriptionClock(purchasedAtMs),
    });
    await first.loadPaywall("onboarding");
    await first.purchase("excerlock_monthly");

    const restored: SubscriptionModule = new MockSubscriptionModule({
      clock: new ManualSubscriptionClock(renewalAtMs - 1),
    });
    expect(isPremiumEntitled(await restored.getSnapshot())).toBe(true);

    const expired: SubscriptionModule = new MockSubscriptionModule({
      clock: new ManualSubscriptionClock(renewalAtMs),
    });
    expect(isPremiumEntitled(await expired.getSnapshot())).toBe(false);
  });
});
