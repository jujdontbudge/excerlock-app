jest.mock(
  "@react-native-async-storage/async-storage",
  () => require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);

import AsyncStorage from "@react-native-async-storage/async-storage";
import { LEGACY_FLOW_SCREENS } from "@excerlock/analytics-events";

import {
  DEFAULT_ONBOARDING_PROGRESS,
  FLOW,
  ONBOARDING_STORAGE_KEY,
  useOnboardingStore,
} from "..";

describe("onboarding flow state machine", () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    useOnboardingStore.setState(DEFAULT_ONBOARDING_PROGRESS);
  });

  it("walks forward and back through the imported LEGACY_FLOW_SCREENS order", () => {
    expect(FLOW.map(({ screen }) => screen)).toEqual(LEGACY_FLOW_SCREENS);
    expect(useOnboardingStore.getState().currentStep).toBe(LEGACY_FLOW_SCREENS[0]);

    for (const expectedStep of LEGACY_FLOW_SCREENS.slice(1)) {
      useOnboardingStore.getState().advance();
      expect(useOnboardingStore.getState().currentStep).toBe(expectedStep);
    }

    for (const expectedStep of [...LEGACY_FLOW_SCREENS].reverse().slice(1)) {
      useOnboardingStore.getState().back();
      expect(useOnboardingStore.getState().currentStep).toBe(expectedStep);
    }

    useOnboardingStore.getState().back();
    expect(useOnboardingStore.getState().currentStep).toBe(LEGACY_FLOW_SCREENS[0]);
  });

  it("persists completion when the user advances from the final screen", async () => {
    for (let step = 0; step < LEGACY_FLOW_SCREENS.length; step += 1) {
      useOnboardingStore.getState().advance();
    }

    expect(useOnboardingStore.getState().isComplete).toBe(true);
    await Promise.resolve();

    const savedProgress = await AsyncStorage.getItem(ONBOARDING_STORAGE_KEY);
    expect(savedProgress).not.toBeNull();

    useOnboardingStore.setState(DEFAULT_ONBOARDING_PROGRESS);
    await AsyncStorage.setItem(ONBOARDING_STORAGE_KEY, savedProgress!);
    await useOnboardingStore.persist.rehydrate();

    expect(useOnboardingStore.getState().isComplete).toBe(true);
    expect(useOnboardingStore.getState().currentStep).toBe(LEGACY_FLOW_SCREENS.at(-1));
  });
});
