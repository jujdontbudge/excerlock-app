jest.mock(
  "@react-native-async-storage/async-storage",
  () => require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);

import { getSubscriptionModule } from "..";

describe("Subscription composition seam", () => {
  it("returns one module instance from the Phase-5 swap point", () => {
    expect(getSubscriptionModule()).toBe(getSubscriptionModule());
  });
});
