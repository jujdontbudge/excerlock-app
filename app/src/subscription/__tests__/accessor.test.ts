jest.mock(
  "@react-native-async-storage/async-storage",
  () => require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);

import { getSubscriptionModule } from "..";
import { AdaptySubscriptionModule } from "../AdaptySubscriptionModule";
import {
  createSubscriptionModule,
  shouldUseAdaptySubscriptionModule,
} from "../accessor";
import { MockSubscriptionModule } from "../MockSubscriptionModule";
import { NoopSubscriptionModule } from "../NoopSubscriptionModule";

describe("Subscription composition seam", () => {
  it("returns one module instance from the Phase-5 swap point", () => {
    expect(getSubscriptionModule()).toBe(getSubscriptionModule());
  });

  it("selects Adapty only for keyed non-test runtimes", () => {
    expect(
      shouldUseAdaptySubscriptionModule({
        nodeEnv: "production",
        adaptyKey: "public-sdk-key",
      }),
    ).toBe(true);
    expect(
      shouldUseAdaptySubscriptionModule({
        nodeEnv: "production",
        adaptyKey: "   ",
      }),
    ).toBe(false);
    expect(
      shouldUseAdaptySubscriptionModule({
        nodeEnv: "test",
        adaptyKey: "public-sdk-key",
      }),
    ).toBe(false);
  });

  it("keeps the mock for tests and fails closed when production is keyless", async () => {
    const sdk = {
      activate: jest.fn().mockResolvedValue(undefined),
      addEventListener: jest.fn().mockReturnValue({ remove: jest.fn() }),
      getProfile: jest.fn().mockResolvedValue({ profileId: "anonymous" }),
      getFlow: jest.fn(),
      getPaywallProducts: jest.fn(),
      logShowFlow: jest.fn(),
      makePurchase: jest.fn(),
      restorePurchases: jest.fn(),
    };

    expect(
      createSubscriptionModule(
        { nodeEnv: "test", adaptyKey: "public-sdk-key" },
        sdk,
      ),
    ).toBeInstanceOf(MockSubscriptionModule);
    expect(
      createSubscriptionModule(
        { nodeEnv: "production", adaptyKey: "public-sdk-key" },
        sdk,
      ),
    ).toBeInstanceOf(AdaptySubscriptionModule);

    const keyless = createSubscriptionModule({
      nodeEnv: "production",
      adaptyKey: undefined,
    });
    expect(keyless).toBeInstanceOf(NoopSubscriptionModule);
    await expect(keyless.loadPaywall("onboarding")).resolves.toBeUndefined();
    await expect(keyless.getSnapshot()).resolves.toMatchObject({
      entitlement: { status: "inactive" },
      paywall: { status: "error", placement: "onboarding" },
    });
  });
});
