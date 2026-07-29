jest.mock(
  "@react-native-async-storage/async-storage",
  () => require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);

import AsyncStorage from "@react-native-async-storage/async-storage";

import { MockAccountModule } from "../MockAccountModule";
import type { AccountModule } from "../AccountModule";
import { ManualAccountClock } from "../clock";

describe("MockAccountModule", () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it("starts signed out and signs in through an observable intent", async () => {
    const account: AccountModule = new MockAccountModule({
      clock: new ManualAccountClock(1_000),
    });
    const observed: string[] = [];
    account.subscribe((snapshot) => {
      observed.push(`${snapshot.session.status}:${snapshot.intent.status}`);
    });

    expect(await account.getSnapshot()).toEqual({
      session: { status: "signedOut" },
      intent: { status: "idle", error: null },
    });

    await expect(account.signIn()).resolves.toMatchObject({
      status: "authenticated",
      session: {
        status: "signedIn",
        authenticatedAtMs: 1_000,
        user: {
          id: "mock_returning_user",
          email: "member@excerlock.test",
        },
      },
    });
    expect(observed).toEqual(["signedOut:signingIn", "signedIn:idle"]);
  });

  it("leaves the user signed out when sign in is cancelled", async () => {
    const mock = new MockAccountModule();
    const account: AccountModule = mock;
    mock.setNextSignInResult("cancelled");

    await expect(account.signIn()).resolves.toEqual({ status: "cancelled" });
    expect(await account.getSnapshot()).toEqual({
      session: { status: "signedOut" },
      intent: { status: "idle", error: null },
    });
  });
});
