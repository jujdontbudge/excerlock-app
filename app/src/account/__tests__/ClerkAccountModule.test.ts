import { ClerkAccountModule } from "../ClerkAccountModule";

describe("ClerkAccountModule", () => {
  it("publishes a Clerk-authenticated user through the account boundary", async () => {
    const account = new ClerkAccountModule();
    const snapshots: string[] = [];
    account.subscribe((snapshot) => snapshots.push(snapshot.intent.status));
    account.attachRuntime({
      authenticate: jest.fn(async () => ({
        status: "authenticated" as const,
        user: {
          id: "user_clerk_123",
          email: "member@example.com",
          authenticatedAtMs: 1_785_542_400_000,
        },
      })),
      deleteAccount: jest.fn(async () => undefined),
      signOut: jest.fn(async () => undefined),
    });

    await expect(account.signIn()).resolves.toEqual({
      status: "authenticated",
      session: {
        status: "signedIn",
        user: { id: "user_clerk_123", email: "member@example.com" },
        authenticatedAtMs: 1_785_542_400_000,
      },
    });
    expect(await account.getSnapshot()).toEqual({
      session: {
        status: "signedIn",
        user: { id: "user_clerk_123", email: "member@example.com" },
        authenticatedAtMs: 1_785_542_400_000,
      },
      intent: { status: "idle", error: null },
    });
    expect(snapshots).toEqual(["signingIn", "idle"]);
  });

  it("normalizes a dismissed Clerk browser flow as cancellation", async () => {
    const account = new ClerkAccountModule();
    account.attachRuntime({
      authenticate: jest.fn(async () => ({ status: "cancelled" as const })),
      deleteAccount: jest.fn(async () => undefined),
      signOut: jest.fn(async () => undefined),
    });

    await expect(account.signIn()).resolves.toEqual({ status: "cancelled" });
    expect(await account.getSnapshot()).toEqual({
      session: { status: "signedOut" },
      intent: { status: "idle", error: null },
    });
  });

  it("uses Clerk SSO to create an account", async () => {
    const account = new ClerkAccountModule();
    const authenticate = jest.fn(async () => ({
      status: "authenticated" as const,
      user: {
        id: "user_new",
        email: "new@example.com",
        authenticatedAtMs: 1_785_542_500_000,
      },
    }));
    account.attachRuntime({
      authenticate,
      deleteAccount: jest.fn(async () => undefined),
      signOut: jest.fn(async () => undefined),
    });

    await expect(account.signUp()).resolves.toMatchObject({
      status: "authenticated",
      session: { user: { id: "user_new", email: "new@example.com" } },
    });
    expect(authenticate).toHaveBeenCalledTimes(1);
  });

  it("normalizes Clerk authentication failures", async () => {
    const account = new ClerkAccountModule();
    account.attachRuntime({
      authenticate: jest.fn(async () => {
        throw new Error("network details must stay behind the boundary");
      }),
      deleteAccount: jest.fn(async () => undefined),
      signOut: jest.fn(async () => undefined),
    });

    await expect(account.signIn()).resolves.toEqual({
      status: "failed",
      error: {
        code: "sign_in_failed",
        message: "We couldn't sign you in. Please try again.",
      },
    });
    expect((await account.getSnapshot()).session.status).toBe("signedOut");
  });

  it("restores a Clerk session loaded from the keychain", async () => {
    const account = new ClerkAccountModule();

    account.synchronizeUser({
      id: "user_restored",
      email: "restored@example.com",
      authenticatedAtMs: 1_785_542_600_000,
    });

    expect(await account.getSnapshot()).toEqual({
      session: {
        status: "signedIn",
        user: { id: "user_restored", email: "restored@example.com" },
        authenticatedAtMs: 1_785_542_600_000,
      },
      intent: { status: "idle", error: null },
    });
  });

  it("signs out through Clerk and clears only the account session", async () => {
    const signOut = jest.fn(async () => undefined);
    const account = new ClerkAccountModule();
    account.attachRuntime({
      authenticate: jest.fn(),
      deleteAccount: jest.fn(async () => undefined),
      signOut,
    });
    account.synchronizeUser({
      id: "user_signed_in",
      email: "member@example.com",
      authenticatedAtMs: 1_785_542_700_000,
    });

    await expect(account.signOut()).resolves.toEqual({ status: "signedOut" });
    expect(signOut).toHaveBeenCalledTimes(1);
    expect((await account.getSnapshot()).session).toEqual({
      status: "signedOut",
    });
  });

  it("deletes the Clerk account before clearing the account session", async () => {
    const deleteAccount = jest.fn(async () => undefined);
    const account = new ClerkAccountModule();
    account.attachRuntime({
      authenticate: jest.fn(),
      deleteAccount,
      signOut: jest.fn(async () => undefined),
    });
    account.synchronizeUser({
      id: "user_delete",
      email: "delete@example.com",
      authenticatedAtMs: 1_785_542_800_000,
    });

    await expect(account.deleteAccount()).resolves.toEqual({
      status: "deleted",
    });
    expect(deleteAccount).toHaveBeenCalledTimes(1);
    expect((await account.getSnapshot()).session.status).toBe("signedOut");
  });
});
