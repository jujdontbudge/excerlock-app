jest.mock(
  "@react-native-async-storage/async-storage",
  () => require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);

import AsyncStorage from "@react-native-async-storage/async-storage";
import { fireEvent, render, screen } from "@testing-library/react-native";

import { NoopAccountModule } from "@/account/NoopAccountModule";
import { installSubscriptionModule } from "@/subscription/accessor";
import { NoopSubscriptionModule } from "@/subscription/NoopSubscriptionModule";

import { OnboardingFlow } from "../OnboardingFlow";
import { useOnboardingStore } from "../store/onboardingStore";

/**
 * A build with no Adapty key and no Clerk key -- which is what the device-smoke
 * recipe produces -- gets NoopSubscriptionModule and NoopAccountModule. Both
 * fail every call by design. The paywall and sign-up steps are the last two in
 * the rail, so before this was fixed neither could ever be passed: onboarding
 * never reached isComplete, and every cold start re-entered it forever. That is
 * #108, and it made the whole physical-device suite unrunnable.
 */
describe("onboarding in a keyless build", () => {
  let restoreSubscription: () => void;

  beforeEach(async () => {
    await AsyncStorage.clear();
    useOnboardingStore.getState().reset();
    restoreSubscription = installSubscriptionModule(
      new NoopSubscriptionModule(),
    );
  });

  afterEach(() => {
    restoreSubscription();
  });

  it("can still be completed from the paywall onward", async () => {
    const onComplete = jest.fn();
    useOnboardingStore.setState({ currentStep: "paywall" });

    await render(
      <OnboardingFlow
        account={new NoopAccountModule()}
        onComplete={onComplete}
      />,
    );

    fireEvent.press(
      await screen.findByRole("button", { name: "Continue without a plan" }),
    );

    expect(useOnboardingStore.getState().currentStep).toBe("sign-up");

    fireEvent.press(
      await screen.findByRole("button", { name: "Create account" }),
    );
    fireEvent.press(
      await screen.findByRole("button", {
        name: "Continue without an account",
      }),
    );

    expect(useOnboardingStore.getState().isComplete).toBe(true);
    expect(onComplete).toHaveBeenCalledTimes(1);
  });
});
