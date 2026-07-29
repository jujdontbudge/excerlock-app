jest.mock(
  "@react-native-async-storage/async-storage",
  () => require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);

import AsyncStorage from "@react-native-async-storage/async-storage";
import { fireEvent, render, screen } from "@testing-library/react-native";

import { AccountOnboarding } from "../AccountOnboarding";
import { MockAccountModule } from "../MockAccountModule";

describe("AccountOnboarding", () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it("creates the required post-purchase account before continuing", async () => {
    const onAuthenticated = jest.fn();
    await render(
      <AccountOnboarding
        account={new MockAccountModule()}
        onAuthenticated={onAuthenticated}
        onBack={jest.fn()}
      />,
    );

    expect(
      await screen.findByRole("header", { name: "Create your account" }),
    ).toBeOnTheScreen();
    expect(
      screen.getByText(
        "Save your plan and connect account-backed services. Your earning and locking data stays on this device.",
      ),
    ).toBeOnTheScreen();

    await fireEvent.press(
      screen.getByRole("button", { name: "Create account" }),
    );

    expect(onAuthenticated).toHaveBeenCalledTimes(1);
  });

  it("stays on the required step when sign up is cancelled", async () => {
    const account = new MockAccountModule();
    account.setNextSignUpResult("cancelled");
    const onAuthenticated = jest.fn();
    await render(
      <AccountOnboarding
        account={account}
        onAuthenticated={onAuthenticated}
      />,
    );
    await screen.findByRole("header", { name: "Create your account" });

    await fireEvent.press(
      screen.getByRole("button", { name: "Create account" }),
    );

    expect(onAuthenticated).not.toHaveBeenCalled();
    expect(
      screen.getByRole("button", { name: "Create account" }),
    ).toBeEnabled();
    expect(screen.queryByRole("alert")).not.toBeOnTheScreen();
  });
});
