jest.mock(
  "@react-native-async-storage/async-storage",
  () => require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);

import { getSubscriptionModule } from "..";
import { shouldUseAdaptySubscriptionModule } from "../accessor";

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
});
