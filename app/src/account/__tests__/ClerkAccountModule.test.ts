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
});
