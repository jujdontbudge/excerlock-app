jest.mock(
  "@react-native-async-storage/async-storage",
  () => require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);

import AsyncStorage from "@react-native-async-storage/async-storage";
import { fireEvent, render, screen } from "@testing-library/react-native";

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

  it("renders the signed-in identity and session controls", async () => {
    const account = new MockAccountModule();
    await account.signUp();

    await render(<AccountSettingsCard account={account} />);

    expect(await screen.findByText("Signed in")).toBeOnTheScreen();
    expect(screen.getByText("new-member@excerlock.test")).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Sign out" })).toBeEnabled();
    expect(
      screen.getByRole("button", { name: "Delete account" }),
    ).toBeEnabled();
  });

  it("explains deletion consequences and lets the user cancel", async () => {
    const account = new MockAccountModule();
    await account.signUp();
    await render(<AccountSettingsCard account={account} />);
    await screen.findByText("Signed in");

    await fireEvent.press(
      screen.getByRole("button", { name: "Delete account" }),
    );

    expect(
      screen.getByRole("header", { name: "Delete your account forever?" }),
    ).toBeOnTheScreen();
    expect(
      screen.getByText(
        "Your Clerk account and ExcerLock server record will be permanently deleted. Adapty and PostHog erasure will be scheduled.",
      ),
    ).toBeOnTheScreen();
    expect(
      screen.getByText(
        "Your conditions, earning history, lock choices, and settings remain on this device.",
      ),
    ).toBeOnTheScreen();
    expect(screen.getByText("This cannot be undone.")).toBeOnTheScreen();

    await fireEvent.press(
      screen.getByRole("button", { name: "Keep my account" }),
    );

    expect(
      screen.queryByRole("header", { name: "Delete your account forever?" }),
    ).not.toBeOnTheScreen();
    expect((await account.getSnapshot()).session.status).toBe("signedIn");
  });
});
