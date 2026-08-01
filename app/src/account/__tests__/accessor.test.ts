jest.mock(
  "@react-native-async-storage/async-storage",
  () => require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);

import { getAccountModule } from "..";

describe("Account composition seam", () => {
  it("returns one module instance from the Phase-5 swap point", () => {
    expect(getAccountModule()).toBe(getAccountModule());
  });

  it("selects a fail-safe Clerk adapter when the publishable key is configured", async () => {
    const previousKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY;
    process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY = "pk_test_configured";
    jest.resetModules();

    try {
      const { getAccountModule: getConfiguredAccount } = require(
        "../accessor",
      ) as typeof import("../accessor");
      const account = getConfiguredAccount();

      await expect(account.signIn()).resolves.toEqual({
        status: "failed",
        error: {
          code: "sign_in_failed",
          message: "Account sign-in is still loading. Please try again.",
        },
      });
      expect((await account.getSnapshot()).session.status).toBe("signedOut");
    } finally {
      if (previousKey === undefined) {
        delete process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY;
      } else {
        process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY = previousKey;
      }
      jest.resetModules();
    }
  });

  it("degrades to a signed-out no-op when Clerk is not configured", async () => {
    const account = getAccountModule();

    expect((await account.getSnapshot()).session.status).toBe("signedOut");
    await expect(account.signIn()).resolves.toEqual({
      status: "failed",
      error: {
        code: "sign_in_failed",
        message: "Account sign-in is unavailable in this build.",
      },
    });
    expect((await account.getSnapshot()).session.status).toBe("signedOut");
  });
});
