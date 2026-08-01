import { render } from "@testing-library/react-native";
import { Text } from "react-native";

import { AccountRuntimeRoot } from "../AccountRuntimeRoot";

const mockClerkProvider = jest.fn(
  ({ children }: { children: React.ReactNode }) => children,
);
jest.mock("@clerk/clerk-expo", () => ({
  ClerkProvider: (props: { children: React.ReactNode }) =>
    mockClerkProvider(props),
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
      <AccountRuntimeRoot publishableKey="pk_test_configured">
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
});
