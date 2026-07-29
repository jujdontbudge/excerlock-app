import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  FLOW_SCREENS,
  isFlowScreen,
  type FlowScreen,
} from "@excerlock/analytics-events";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export type OnboardingProgress = Readonly<{
  currentStep: FlowScreen;
  isComplete: boolean;
}>;

export const DEFAULT_ONBOARDING_PROGRESS: OnboardingProgress = Object.freeze({
  currentStep: FLOW_SCREENS[0],
  isComplete: false,
});

type OnboardingStore = OnboardingProgress & {
  advance: () => void;
  back: () => void;
  reset: () => void;
};

export const ONBOARDING_STORAGE_KEY = "excerlock.onboarding.v1";

function readPersistedProgress(persistedState: unknown): OnboardingProgress {
  if (typeof persistedState !== "object" || persistedState === null) {
    return DEFAULT_ONBOARDING_PROGRESS;
  }

  const currentStep = Reflect.get(persistedState, "currentStep");
  const isComplete = Reflect.get(persistedState, "isComplete");

  return {
    currentStep: isFlowScreen(currentStep)
      ? currentStep
      : DEFAULT_ONBOARDING_PROGRESS.currentStep,
    isComplete: typeof isComplete === "boolean" ? isComplete : false,
  };
}

export const useOnboardingStore = create<OnboardingStore>()(
  persist(
    (set, get) => ({
      ...DEFAULT_ONBOARDING_PROGRESS,
      advance: () => {
        const index = FLOW_SCREENS.indexOf(get().currentStep);
        const nextStep = FLOW_SCREENS[index + 1];

        if (nextStep === undefined) {
          set({ isComplete: true });
          return;
        }

        set({ currentStep: nextStep });
      },
      back: () => {
        const index = FLOW_SCREENS.indexOf(get().currentStep);
        const previousStep = FLOW_SCREENS[index - 1];

        if (previousStep !== undefined) {
          set({ currentStep: previousStep });
        }
      },
      reset: () => {
        set(DEFAULT_ONBOARDING_PROGRESS);
      },
    }),
    {
      name: ONBOARDING_STORAGE_KEY,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: ({ currentStep, isComplete }) => ({ currentStep, isComplete }),
      merge: (persistedState, currentState) => ({
        ...currentState,
        ...readPersistedProgress(persistedState),
      }),
    },
  ),
);
