import { act, render } from "@testing-library/react-native";
import { Text } from "react-native";

import { AccountRuntimeRoot } from "../AccountRuntimeRoot";
import { ClerkAccountModule } from "../ClerkAccountModule";

const mockClerkProvider = jest.fn(
  ({ children }: { children: React.ReactNode }) => children,
);
const mockRuntimeUser = {
  id: "user_root",
  primaryEmailAddress: { emailAddress: "root@example.com" },
  emailAddresses: [],
  lastSignInAt: new Date(1_785_543_000_000),
  delete: jest.fn(async () => undefined),
};
const mockSetActive = jest.fn(async () => undefined);
jest.mock("@clerk/clerk-expo", () => ({
  ClerkProvider: (props: { children: React.ReactNode }) =>
    mockClerkProvider(props),
  useClerk: () => ({
    client: { sessions: [{ id: "sess_root", user: mockRuntimeUser }] },
    signOut: jest.fn(async () => undefined),
    user: mockRuntimeUser,
  }),
  useSSO: () => ({
    startSSOFlow: jest.fn(async () => ({
      authSessionResult: {
        type: "success" as const,
        url: "excerlock://sso-callback",
      },
      createdSessionId: "sess_root",
      setActive: mockSetActive,
    })),
  }),
  useUser: () => ({ isLoaded: true, isSignedIn: false, user: null }),
}));

jest.mock("@clerk/clerk-expo/token-cache", () => ({
  tokenCache: Object.freeze({
    getToken: jest.fn(),
    saveToken: jest.fn(),
  }),
}));

const { tokenCache: mockTokenCache } = require(
  "@clerk/clerk-expo/token-cache",
) as typeof import("@clerk/clerk-expo/token-cache");

describe("AccountRuntimeRoot", () => {
  beforeEach(() => {
    mockClerkProvider.mockClear();
  });

  it("configures Clerk with its SecureStore-backed token cache", async () => {
    await render(
      <AccountRuntimeRoot
        account={new ClerkAccountModule()}
        publishableKey="pk_test_configured"
      >
        <Text>App content</Text>
      </AccountRuntimeRoot>,
    );

    expect(mockClerkProvider).toHaveBeenCalledWith(
      expect.objectContaining({
        publishableKey: "pk_test_configured",
        tokenCache: mockTokenCache,
      }),
    );
  });

  it("attaches the configured account adapter to Clerk", async () => {
    const account = new ClerkAccountModule();
    await render(
      <AccountRuntimeRoot
        account={account}
        publishableKey="pk_test_configured"
      >
        <Text>App content</Text>
      </AccountRuntimeRoot>,
    );

    let result: Awaited<ReturnType<typeof account.signIn>> | undefined;
    await act(async () => {
      result = await account.signIn();
    });
    expect(result).toMatchObject({
      status: "authenticated",
      session: { user: { id: "user_root", email: "root@example.com" } },
    });
  });
});
