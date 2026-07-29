jest.mock(
  "@react-native-async-storage/async-storage",
  () => require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);

import AsyncStorage from "@react-native-async-storage/async-storage";

import { MockSubscriptionModule } from "../MockSubscriptionModule";
import type { SubscriptionModule } from "../SubscriptionModule";
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
});
