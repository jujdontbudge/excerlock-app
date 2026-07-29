jest.mock(
  "@react-native-async-storage/async-storage",
  () => require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);

import { fireEvent, render, screen } from "@testing-library/react-native";

import {
  ConfessionScreen,
  DEFAULT_CONFESSION,
  MirrorScreen,
  PaywallScreen,
  PickAppsScreen,
  PermissionsPrimerScreen,
  SignUpScreen,
  useConfessionStore,
  ValuePropScreen,
} from "..";

describe("onboarding screens", () => {
  beforeEach(() => {
    useConfessionStore.setState(DEFAULT_CONFESSION);
  });

  it("renders the value proposition and advances from its single action", async () => {
    const onContinue = jest.fn();
    await render(<ValuePropScreen onContinue={onContinue} />);

    expect(
      screen.getByRole("header", { name: "Earn your screen time" }),
    ).toBeOnTheScreen();
    expect(
      screen.getByText("Turn movement and healthy habits into time on the apps you choose."),
    ).toBeOnTheScreen();

    fireEvent.press(screen.getByRole("button", { name: "Get started" }));
    expect(onContinue).toHaveBeenCalledTimes(1);
  });

  it("renders confession as one adjustable input and persists its minutes", async () => {
    const onContinue = jest.fn();
    const onBack = jest.fn();
    await render(
      <ConfessionScreen onContinue={onContinue} onBack={onBack} />,
    );

    expect(
      screen.getByRole("header", {
        name: "How much time do you spend on your phone each day?",
      }),
    ).toBeOnTheScreen();

    const slider = screen.getByRole("adjustable", {
      name: "Daily phone time",
    });
    expect(slider).toHaveAccessibilityValue({ now: 300, text: "5 hours" });

    await fireEvent(slider, "accessibilityAction", {
      nativeEvent: { actionName: "increment" },
    });
    expect(
      screen.getByRole("adjustable", { name: "Daily phone time" }),
    ).toHaveAccessibilityValue({ now: 330, text: "5 hours 30 minutes" });

    await fireEvent.press(screen.getByRole("button", { name: "Continue" }));
    expect(useConfessionStore.getState().confessedDailyMinutes).toBe(330);
    expect(onContinue).toHaveBeenCalledTimes(1);

    await fireEvent.press(screen.getByRole("button", { name: "Back" }));
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it("renders the mirror from the user's confessed daily minutes", async () => {
    const onContinue = jest.fn();
    const onBack = jest.fn();
    useConfessionStore.setState({ confessedDailyMinutes: 300 });

    await render(<MirrorScreen onContinue={onContinue} onBack={onBack} />);

    expect(
      screen.getByRole("header", { name: "That's ~76 days a year" }),
    ).toBeOnTheScreen();
    expect(
      screen.getByText("5 hours a day becomes 1,825 hours every year."),
    ).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole("button", { name: "Take it back" }));
    expect(onContinue).toHaveBeenCalledTimes(1);

    await fireEvent.press(screen.getByRole("button", { name: "Back" }));
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it("renders the permissions primer without requesting authorization", async () => {
    const onContinue = jest.fn();
    await render(
      <PermissionsPrimerScreen
        onContinue={onContinue}
        onBack={jest.fn()}
      />,
    );

    expect(
      screen.getByRole("header", {
        name: "Screen Time keeps your choices honest",
      }),
    ).toBeOnTheScreen();
    expect(
      screen.getByText(
        "You'll choose which apps ExcerLock can pause. iOS keeps the list private.",
      ),
    ).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole("button", { name: "Continue" }));
    expect(onContinue).toHaveBeenCalledTimes(1);
  });

  it("renders the locked-app picker scaffold", async () => {
    const onContinue = jest.fn();
    await render(
      <PickAppsScreen onContinue={onContinue} onBack={jest.fn()} />,
    );

    expect(
      screen.getByRole("header", { name: "Pick the apps that can wait" }),
    ).toBeOnTheScreen();
    expect(
      screen.getByText(
        "Choose distracting apps now. Phone and emergency access always stay available.",
      ),
    ).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole("button", { name: "Choose apps" }));
    expect(onContinue).toHaveBeenCalledTimes(1);
  });

  it("renders the hard-paywall scaffold without starting a purchase", async () => {
    const onContinue = jest.fn();
    await render(<PaywallScreen onContinue={onContinue} onBack={jest.fn()} />);

    expect(
      screen.getByRole("header", { name: "Unlock the full ExcerLock plan" }),
    ).toBeOnTheScreen();
    expect(screen.getByText("Annual and monthly plans")).toBeOnTheScreen();
    expect(
      screen.getByText("Trial available on the annual plan"),
    ).toBeOnTheScreen();

    await fireEvent.press(
      screen.getByRole("button", { name: "Start free trial" }),
    );
    expect(onContinue).toHaveBeenCalledTimes(1);
  });

  it("renders the shared post-purchase account surface", async () => {
    const onContinue = jest.fn();
    await render(<SignUpScreen onContinue={onContinue} onBack={jest.fn()} />);

    expect(
      await screen.findByRole("header", { name: "Create your account" }),
    ).toBeOnTheScreen();
    expect(
      screen.getByText(
        "Save your plan and connect account-backed services. Your earning and locking data stays on this device.",
      ),
    ).toBeOnTheScreen();
    expect(
      screen.getByRole("button", { name: "Sign in instead" }),
    ).toBeEnabled();

    await fireEvent.press(
      screen.getByRole("button", { name: "Create account" }),
    );
    expect(onContinue).toHaveBeenCalledTimes(1);
  });
});
