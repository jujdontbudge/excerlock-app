jest.mock(
  "@react-native-async-storage/async-storage",
  () => require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);

import { fireEvent, render, screen } from "@testing-library/react-native";
import { MockAccountModule } from "../../account/MockAccountModule";

import {
  DEFAULT_ONBOARDING_PROGRESS,
  OnboardingFlow,
  useOnboardingStore,
} from "..";

describe("OnboardingFlow", () => {
  beforeEach(() => {
    useOnboardingStore.setState(DEFAULT_ONBOARDING_PROGRESS);
  });

  it("renders persisted progress and coordinates forward and back", async () => {
    useOnboardingStore.setState({ currentStep: "mirror" });

    await render(<OnboardingFlow onComplete={jest.fn()} />);

    expect(
      screen.getByRole("header", { name: "That's ~76 days a year" }),
    ).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole("button", { name: "Take it back" }));
    expect(useOnboardingStore.getState().currentStep).toBe(
      "permissions-primer",
    );
    expect(
      screen.getByRole("header", {
        name: "Screen Time keeps your choices honest",
      }),
    ).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole("button", { name: "Back" }));
    expect(useOnboardingStore.getState().currentStep).toBe("mirror");
    expect(
      screen.getByRole("header", { name: "That's ~76 days a year" }),
    ).toBeOnTheScreen();
  });

  it("marks the rail complete before handing navigation back to its route", async () => {
    const onComplete = jest.fn(() => {
      expect(useOnboardingStore.getState().isComplete).toBe(true);
    });
    useOnboardingStore.setState({ currentStep: "sign-up" });

    await render(
      <OnboardingFlow
        account={new MockAccountModule()}
        onComplete={onComplete}
      />,
    );
    await fireEvent.press(
      screen.getByRole("button", { name: "Create account" }),
    );

    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(useOnboardingStore.getState().isComplete).toBe(true);
  });
});
