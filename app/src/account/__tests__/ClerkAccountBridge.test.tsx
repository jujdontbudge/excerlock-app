import { act, render } from "@testing-library/react-native";
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
const mockUser = {
  id: "user_123",
  primaryEmailAddress: { emailAddress: "member@example.com" },
  emailAddresses: [],
  lastSignInAt: new Date(1_785_542_900_000),
  delete: mockDelete,
};

jest.mock("@clerk/clerk-expo", () => ({
  useClerk: () => ({
    client: { sessions: [{ id: "sess_123", user: mockUser }] },
    signOut: mockSignOut,
  }),
  useSSO: () => ({ startSSOFlow: mockStartSSOFlow }),
  useUser: () => ({ isLoaded: true, isSignedIn: false, user: null }),
}));

describe("ClerkAccountBridge", () => {
  it("authenticates through Clerk SSO and the allowlisted mobile callback", async () => {
    const account = new ClerkAccountModule();
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
    expect(result).toMatchObject({
      status: "authenticated",
      session: { user: { id: "user_123", email: "member@example.com" } },
    });
  });
});
