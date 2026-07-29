jest.mock(
  "@react-native-async-storage/async-storage",
  () => require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);

import AsyncStorage from "@react-native-async-storage/async-storage";
import { act, render, screen } from "@testing-library/react-native";
import { Text } from "react-native";

import {
  DEFAULT_ONBOARDING_PROGRESS,
  OnboardingCompletionGate,
  useOnboardingStore,
} from "..";

describe("onboarding completion gate", () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    useOnboardingStore.setState(DEFAULT_ONBOARDING_PROGRESS);
    await useOnboardingStore.persist.rehydrate();
  });

  it("selects onboarding until persisted progress is complete", async () => {
    await render(
      <OnboardingCompletionGate
        onboarding={<Text>Onboarding destination</Text>}
        app={<Text>App destination</Text>}
      />,
    );

    expect(screen.getByText("Onboarding destination")).toBeOnTheScreen();
    expect(screen.queryByText("App destination")).not.toBeOnTheScreen();

    await act(async () => {
      useOnboardingStore.setState({ isComplete: true });
    });

    expect(screen.getByText("App destination")).toBeOnTheScreen();
    expect(screen.queryByText("Onboarding destination")).not.toBeOnTheScreen();
  });
});
