import { act, render, waitFor } from "@testing-library/react-native";
import { Text } from "react-native";

import { ClerkAccountBridge } from "../ClerkAccountBridge";
import { ClerkAccountModule } from "../ClerkAccountModule";

const mockSetActive = jest.fn(async () => undefined);
const mockStartSSOFlow = jest.fn(async () => ({
  authSessionResult: { type: "success" as const, url: "excerlock://sso-callback" },
  createdSessionId: "sess_123",
  setActive: mockSetActive,
}));
const mockDelete = jest.fn(async () => undefined);
const mockSignOut = jest.fn(async () => undefined);
const mockGetToken = jest.fn(async () => "test_session_token");
const mockUser = {
  id: "user_123",
  primaryEmailAddress: { emailAddress: "member@example.com" },
  emailAddresses: [],
  lastSignInAt: new Date(1_785_542_900_000),
  delete: mockDelete,
};
let mockIsSignedIn = false;
let mockHookUser: typeof mockUser | null = null;

jest.mock("@clerk/clerk-expo", () => ({
  useClerk: () => ({
    client: {
      sessions: [{ id: "sess_123", user: mockUser, getToken: mockGetToken }],
    },
    session: { getToken: mockGetToken },
    signOut: mockSignOut,
    user: mockUser,
  }),
  useSSO: () => ({ startSSOFlow: mockStartSSOFlow }),
  useUser: () => ({
    isLoaded: true,
    isSignedIn: mockIsSignedIn,
    user: mockHookUser,
  }),
}));

jest.mock("../../analytics/index", () => ({
  analytics: {
    discardPending: jest.fn(async () => undefined),
    flush: jest.fn(async () => undefined),
    reset: jest.fn(),
  },
}));

const mockAnalyticsDiscardPending = (
  jest.requireMock("../../analytics/index") as {
    analytics: { discardPending: jest.Mock };
  }
).analytics.discardPending;

const mockAnalyticsReset = (
  jest.requireMock("../../analytics/index") as {
    analytics: { flush: jest.Mock; reset: jest.Mock };
  }
).analytics.reset;
const mockAnalyticsFlush = (
  jest.requireMock("../../analytics/index") as {
    analytics: { flush: jest.Mock; reset: jest.Mock };
  }
).analytics.flush;
const mockResetSubscriptionCustomer = jest.fn(async () => undefined);

describe("ClerkAccountBridge", () => {
  beforeEach(() => {
    mockIsSignedIn = false;
    mockHookUser = null;
    mockAnalyticsReset.mockClear();
    mockAnalyticsDiscardPending.mockClear();
    mockResetSubscriptionCustomer.mockReset();
    mockResetSubscriptionCustomer.mockResolvedValue(undefined);
    mockSignOut.mockClear();
  });

  it("authenticates through Clerk SSO and the allowlisted mobile callback", async () => {
    const fetchSpy = jest
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response(null, { status: 204 }));
    const account = new ClerkAccountModule();
    try {
      await render(
        <ClerkAccountBridge account={account}>
          <Text>App content</Text>
        </ClerkAccountBridge>,
      );

      let result: Awaited<ReturnType<typeof account.signIn>> | undefined;
      await act(async () => {
        result = await account.signIn();
      });

      expect(mockStartSSOFlow).toHaveBeenCalledWith({
        redirectUrl: "excerlock://sso-callback",
        strategy: "oauth_google",
      });
      expect(mockSetActive).toHaveBeenCalledWith({ session: "sess_123" });
      expect(fetchSpy).toHaveBeenCalledWith(
        "https://api.excerlock.com/v1/user",
        {
          headers: { authorization: "Bearer test_session_token" },
          method: "PUT",
        },
      );
      expect(result).toMatchObject({
        status: "authenticated",
        session: { user: { id: "user_123", email: "member@example.com" } },
      });
    } finally {
      fetchSpy.mockRestore();
    }
  });

  it("publishes a restored session only after provisioning retries succeed", async () => {
    mockIsSignedIn = true;
    mockHookUser = mockUser;
    const fetchSpy = jest
      .spyOn(globalThis, "fetch")
      .mockRejectedValueOnce(new Error("temporary network failure"))
      .mockResolvedValue(new Response(null, { status: 204 }));
    const account = new ClerkAccountModule();
    try {
      await render(
        <ClerkAccountBridge account={account} provisionRetryDelayMs={0}>
          <Text>App content</Text>
        </ClerkAccountBridge>,
      );

      expect((await account.getSnapshot()).session.status).toBe("signedOut");
      await waitFor(async () => {
        expect((await account.getSnapshot()).session.status).toBe("signedIn");
      });
      expect(fetchSpy).toHaveBeenCalledTimes(2);
    } finally {
      fetchSpy.mockRestore();
    }
  });

  it("clears a restored identity when the server reports its tombstone", async () => {
    mockIsSignedIn = true;
    mockHookUser = mockUser;
    const fetchSpy = jest
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response(null, { status: 410 }));
    const account = new ClerkAccountModule();
    mockResetSubscriptionCustomer
      .mockRejectedValueOnce(new Error("temporary Adapty failure"))
      .mockResolvedValueOnce(undefined);

    try {
      await render(
        <ClerkAccountBridge
          account={account}
          provisionRetryDelayMs={100}
          resetDeletedSubscriptionCustomer={mockResetSubscriptionCustomer}
        >
          <Text>App content</Text>
        </ClerkAccountBridge>,
      );

      await waitFor(() => {
        expect(mockAnalyticsDiscardPending).toHaveBeenCalledTimes(1);
        expect(mockAnalyticsReset).toHaveBeenCalledTimes(1);
        expect(mockResetSubscriptionCustomer).toHaveBeenCalledTimes(2);
        expect(mockSignOut).toHaveBeenCalledTimes(1);
      });
      expect(fetchSpy).toHaveBeenCalledTimes(1);
      expect((await account.getSnapshot()).session.status).toBe("signedOut");
    } finally {
      fetchSpy.mockRestore();
    }
  });

  it("deletes through the authenticated server before clearing Clerk", async () => {
    const previousBaseUrl = process.env.EXPO_PUBLIC_API_URL;
    delete process.env.EXPO_PUBLIC_API_URL;
    const fetchSpy = jest
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response(null, { status: 204 }));
    const account = new ClerkAccountModule();

    try {
      await render(
        <ClerkAccountBridge
          account={account}
          resetDeletedSubscriptionCustomer={mockResetSubscriptionCustomer}
        >
          <Text>App content</Text>
        </ClerkAccountBridge>,
      );
      account.synchronizeUser({
        id: "user_123",
        email: "member@example.com",
        authenticatedAtMs: 1_785_542_900_000,
      });

      const result = await account.deleteAccount();
      expect(fetchSpy).toHaveBeenCalledWith(
        "https://api.excerlock.com/v1/user",
        {
          headers: { authorization: "Bearer test_session_token" },
          method: "DELETE",
        },
      );
      expect(mockAnalyticsFlush).toHaveBeenCalledTimes(1);
      expect(mockAnalyticsDiscardPending).toHaveBeenCalledTimes(1);
      expect(mockAnalyticsReset).toHaveBeenCalledTimes(1);
      expect(mockResetSubscriptionCustomer).toHaveBeenCalledTimes(1);
      expect(mockSignOut).toHaveBeenCalledTimes(1);
      expect(mockAnalyticsFlush.mock.invocationCallOrder[0])
        .toBeLessThan(fetchSpy.mock.invocationCallOrder[0] ?? 0);
      expect(fetchSpy.mock.invocationCallOrder[0])
        .toBeLessThan(mockAnalyticsDiscardPending.mock.invocationCallOrder[0] ?? 0);
      expect(mockAnalyticsDiscardPending.mock.invocationCallOrder[0])
        .toBeLessThan(mockAnalyticsReset.mock.invocationCallOrder[0] ?? 0);
      expect(mockDelete).not.toHaveBeenCalled();
      expect(result).toEqual({ status: "deleted" });
    } finally {
      fetchSpy.mockRestore();
      if (previousBaseUrl === undefined) {
        delete process.env.EXPO_PUBLIC_API_URL;
      } else {
        process.env.EXPO_PUBLIC_API_URL = previousBaseUrl;
      }
    }
  });
});
