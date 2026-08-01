import type {
  AdaptyFlow,
  AdaptyPaywallProduct,
  AdaptyProfile,
} from "react-native-adapty";

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
    identify: jest.fn().mockResolvedValue(undefined),
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

  it("attaches Clerk identity only after anonymous activation", async () => {
    const sdk = sdkWithProfile({ profileId: "anonymous-profile" });
    const subscription = new AdaptySubscriptionModule("public-sdk-key", sdk);

    await subscription.identifyCustomer("clerk-user-123");

    expect(sdk.identify).toHaveBeenCalledWith("clerk-user-123");
    expect(
      (sdk.activate as jest.Mock).mock.invocationCallOrder[0],
    ).toBeLessThan((sdk.identify as jest.Mock).mock.invocationCallOrder[0]);
  });

  it("renders the placement's remote config and products in returned order", async () => {
    const sdk = sdkWithProfile({ profileId: "anonymous-profile" });
    const flow = {
      id: "onboarding-flow",
      name: "Experiment B",
      variationId: "variant-b",
      placement: {
        id: "onboarding",
        abTestName: "first-price-test",
        audienceName: "all-users",
        audienceVersionId: "audience-v1",
        revision: 2,
      },
      paywalls: [],
      responseCreatedAt: Date.now(),
      remoteConfigs: [
        {
          lang: "en",
          dataString: "{}",
          data: {
            title: "Remote title",
            body: "Remote body",
            valueStatement: "Remote value statement",
            plansTitle: "Pick a remote plan",
            trialStatement: "Annual includes a seven-day trial",
            defaultProductId: "annual.variant-b",
            productBadges: {
              "annual.variant-b": "REMOTE ANNUAL BADGE",
            },
          },
        },
      ],
    } satisfies AdaptyFlow;
    const products = [
      adaptyProduct({
        id: "monthly.variant-b",
        title: "Monthly",
        price: "$12.99",
        period: "month",
      }),
      adaptyProduct({
        id: "annual.variant-b",
        title: "Annual",
        price: "$79.99",
        period: "year",
        trialDays: 7,
      }),
    ];
    (sdk.getFlow as jest.Mock).mockResolvedValue(flow);
    (sdk.getPaywallProducts as jest.Mock).mockResolvedValue(products);
    (sdk.logShowFlow as jest.Mock).mockResolvedValue(undefined);
    const subscription = new AdaptySubscriptionModule("public-sdk-key", sdk);

    await subscription.loadPaywall("onboarding");

    await expect(subscription.getSnapshot()).resolves.toMatchObject({
      paywall: {
        status: "ready",
        paywall: {
          placement: "onboarding",
          title: "Remote title",
          body: "Remote body",
          valueStatement: "Remote value statement",
          plansTitle: "Pick a remote plan",
          trialStatement: "Annual includes a seven-day trial",
          products: [
            {
              id: "monthly.variant-b",
              title: "Monthly",
              price: "$12.99 / month",
              badge: null,
              trialDays: 0,
              durationDays: 30,
              isDefault: false,
            },
            {
              id: "annual.variant-b",
              title: "Annual",
              price: "$79.99 / year",
              badge: "REMOTE ANNUAL BADGE",
              trialDays: 7,
              durationDays: 365,
              isDefault: true,
            },
          ],
        },
      },
    });
    expect(sdk.getFlow).toHaveBeenCalledWith("onboarding");
    expect(sdk.getPaywallProducts).toHaveBeenCalledWith(flow);
    expect(sdk.logShowFlow).toHaveBeenCalledWith(flow);
  });

  it("purchases the selected placement product and unlocks only premium", async () => {
    const activeProfile = profileWithPremium();
    const sdk = sdkWithProfile(activeProfile);
    const product = adaptyProduct({
      id: "annual.variant-a",
      title: "Annual",
      price: "$59.99",
      period: "year",
      trialDays: 7,
    });
    const flow = minimalFlow();
    (sdk.getFlow as jest.Mock).mockResolvedValue(flow);
    (sdk.getPaywallProducts as jest.Mock).mockResolvedValue([product]);
    (sdk.logShowFlow as jest.Mock).mockResolvedValue(undefined);
    (sdk.makePurchase as jest.Mock).mockResolvedValue({
      type: "success",
      profile: activeProfile,
    });
    const subscription = new AdaptySubscriptionModule("public-sdk-key", sdk);
    await subscription.loadPaywall("onboarding");

    await expect(subscription.purchase("annual.variant-a")).resolves.toEqual({
      status: "purchased",
      entitlement: {
        status: "active",
        productId: "com.excerlock.annual",
        purchasedAtMs: Date.parse("2026-07-01T00:00:00.000Z"),
        renewsAtMs: Date.parse("2027-07-01T00:00:00.000Z"),
      },
    });
    expect(sdk.makePurchase).toHaveBeenCalledWith(product);
  });

  it("restores the premium access level from Adapty", async () => {
    const restoredProfile = profileWithPremium({
      vendorProductId: "com.excerlock.winback",
    });
    const sdk = sdkWithProfile(restoredProfile);
    (sdk.restorePurchases as jest.Mock).mockResolvedValue(restoredProfile);
    const subscription = new AdaptySubscriptionModule("public-sdk-key", sdk);

    await expect(subscription.restore()).resolves.toMatchObject({
      status: "restored",
      entitlement: {
        status: "active",
        productId: "com.excerlock.winback",
      },
    });
    await expect(subscription.getSnapshot()).resolves.toMatchObject({
      entitlement: { status: "active", productId: "com.excerlock.winback" },
    });
  });
});

function minimalFlow(): AdaptyFlow {
  return {
    id: "onboarding-flow",
    name: "Onboarding",
    variationId: "variant-a",
    placement: {
      id: "onboarding",
      abTestName: "first-price-test",
      audienceName: "all-users",
      audienceVersionId: "audience-v1",
      revision: 1,
    },
    paywalls: [],
    responseCreatedAt: Date.now(),
  };
}

function adaptyProduct({
  id,
  title,
  price,
  period,
  trialDays = 0,
}: Readonly<{
  id: string;
  title: string;
  price: string;
  period: "month" | "year";
  trialDays?: number;
}>): AdaptyPaywallProduct {
  return {
    adaptyId: `adapty-${id}`,
    accessLevelId: "premium",
    localizedDescription: `${title} billing detail`,
    localizedTitle: title,
    paywallABTestName: "first-price-test",
    paywallName: "Experiment B",
    paywallProductIndex: 0,
    productType: "subscription",
    variationId: "variant-b",
    vendorProductId: id,
    price: { amount: Number(price.slice(1)), localizedString: price },
    subscription: {
      subscriptionPeriod: { numberOfUnits: 1, unit: period },
      localizedSubscriptionPeriod: period,
      offer:
        trialDays === 0
          ? undefined
          : {
              identifier: { type: "introductory" },
              phases: [
                {
                  numberOfPeriods: 1,
                  paymentMode: "free_trial",
                  price: { amount: 0, localizedString: "$0.00" },
                  subscriptionPeriod: {
                    numberOfUnits: trialDays,
                    unit: "day",
                  },
                },
              ],
            },
    },
  };
}
