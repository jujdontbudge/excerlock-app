jest.mock(
  "@react-native-async-storage/async-storage",
  () => require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);

import { getAccountModule } from "..";

describe("Account composition seam", () => {
  it("returns one module instance from the Phase-5 swap point", () => {
    expect(getAccountModule()).toBe(getAccountModule());
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
