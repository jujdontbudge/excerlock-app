jest.mock(
  "@react-native-async-storage/async-storage",
  () => require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);

import AsyncStorage from "@react-native-async-storage/async-storage";
import { fireEvent, render, screen } from "@testing-library/react-native";

import { AccountOnboarding } from "../AccountOnboarding";
import { MockAccountModule } from "../MockAccountModule";
import { NoopAccountModule } from "../NoopAccountModule";

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

  it("shows failed sign up and stays retryable", async () => {
    const account = new MockAccountModule();
    account.setNextSignUpResult({
      status: "failed",
      message: "Account creation is temporarily unavailable.",
    });
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
      screen.getByRole("alert", {
        name: "Account creation is temporarily unavailable.",
      }),
    ).toBeOnTheScreen();
    expect(
      screen.getByRole("button", { name: "Create account" }),
    ).toBeEnabled();
  });

  it("lets an existing user sign in to complete the account step", async () => {
    const onAuthenticated = jest.fn();
    await render(
      <AccountOnboarding
        account={new MockAccountModule()}
        onAuthenticated={onAuthenticated}
      />,
    );
    await screen.findByRole("header", { name: "Create your account" });

    await fireEvent.press(
      screen.getByRole("button", { name: "Sign in instead" }),
    );

    expect(onAuthenticated).toHaveBeenCalledTimes(1);
  });
});

describe("AccountOnboarding when account creation cannot succeed", () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it("offers a way forward once an attempt has actually failed", async () => {
    // NoopAccountModule is what a build without a Clerk key gets, and it fails
    // every attempt. Sign-up is the final onboarding step, so with no exit the
    // rail never reaches isComplete and every cold start re-enters onboarding.
    const onContinueWithoutAccount = jest.fn();
    await render(
      <AccountOnboarding
        account={new NoopAccountModule()}
        onAuthenticated={jest.fn()}
        onContinueWithoutAccount={onContinueWithoutAccount}
      />,
    );

    await screen.findByRole("header", { name: "Create your account" });
    expect(
      screen.queryByRole("button", { name: "Continue without an account" }),
    ).not.toBeOnTheScreen();

    fireEvent.press(screen.getByRole("button", { name: "Create account" }));

    const exit = await screen.findByRole("button", {
      name: "Continue without an account",
    });
    fireEvent.press(exit);

    expect(onContinueWithoutAccount).toHaveBeenCalledTimes(1);
  });

  it("never offers the exit while sign-up is still working", async () => {
    await render(
      <AccountOnboarding
        account={new MockAccountModule()}
        onAuthenticated={jest.fn()}
        onContinueWithoutAccount={jest.fn()}
      />,
    );

    await screen.findByRole("header", { name: "Create your account" });
    expect(
      screen.queryByRole("button", { name: "Continue without an account" }),
    ).not.toBeOnTheScreen();
  });
});
