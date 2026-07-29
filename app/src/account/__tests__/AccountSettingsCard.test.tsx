jest.mock(
  "@react-native-async-storage/async-storage",
  () => require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);

import AsyncStorage from "@react-native-async-storage/async-storage";
import { render, screen } from "@testing-library/react-native";

import { AccountSettingsCard } from "../AccountSettingsCard";
import { MockAccountModule } from "../MockAccountModule";

describe("AccountSettingsCard", () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it("renders signed out without implying core features are gated", async () => {
    await render(
      <AccountSettingsCard account={new MockAccountModule()} />,
    );

    expect(await screen.findByText("Signed out")).toBeOnTheScreen();
    expect(
      screen.getByText(
        "Your conditions, earning history, and locks stay on this device.",
      ),
    ).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Sign in" })).toBeEnabled();
    expect(
      screen.getByRole("button", { name: "Create account" }),
    ).toBeEnabled();
  });
});
