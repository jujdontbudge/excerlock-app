import type { AdaptyProfile } from "react-native-adapty";

import {
  AdaptySubscriptionModule,
  type AdaptySDKPort,
} from "../AdaptySubscriptionModule";

function profileWithPremium(
  overrides: Partial<NonNullable<AdaptyProfile["accessLevels"]>[string]> = {},
): AdaptyProfile {
  return {
    profileId: "anonymous-profile",
    accessLevels: {
      premium: {
        activatedAt: new Date("2026-07-01T00:00:00.000Z"),
        expiresAt: new Date("2027-07-01T00:00:00.000Z"),
        id: "premium",
        isActive: true,
        isInGracePeriod: false,
        isLifetime: false,
        isRefund: false,
        store: "app_store",
        vendorProductId: "com.excerlock.annual",
        willRenew: true,
        ...overrides,
      },
    },
  };
}

function sdkWithProfile(profile: AdaptyProfile): AdaptySDKPort {
  return {
    activate: jest.fn().mockResolvedValue(undefined),
    addEventListener: jest.fn().mockReturnValue({ remove: jest.fn() }),
    getProfile: jest.fn().mockResolvedValue(profile),
    getFlow: jest.fn(),
    getPaywallProducts: jest.fn(),
    logShowFlow: jest.fn(),
    makePurchase: jest.fn(),
    restorePurchases: jest.fn(),
  };
}

describe("AdaptySubscriptionModule", () => {
  it("activates anonymously and maps the premium access level", async () => {
    const sdk = sdkWithProfile(profileWithPremium());
    const subscription = new AdaptySubscriptionModule("public-sdk-key", sdk);

    await expect(subscription.getSnapshot()).resolves.toMatchObject({
      entitlement: {
        status: "active",
        productId: "com.excerlock.annual",
        purchasedAtMs: Date.parse("2026-07-01T00:00:00.000Z"),
        renewsAtMs: Date.parse("2027-07-01T00:00:00.000Z"),
      },
    });
    expect(sdk.activate).toHaveBeenCalledWith("public-sdk-key", {
      __ignoreActivationOnFastRefresh: true,
    });
  });
});
