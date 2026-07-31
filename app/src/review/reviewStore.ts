import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import type { ReviewPromptState } from "./policy";

export const DEFAULT_REVIEW_PROMPT_STATE: ReviewPromptState = Object.freeze({
  installedAtMs: null,
  unlockMomentCount: 0,
  promptCount: 0,
  manualRateTapped: false,
  lastShieldShownAtMs: null,
});

type ReviewPromptStore = ReviewPromptState & {
  ensureInstallTimestamp: (atMs: number) => void;
  recordUnlockMoment: () => void;
  recordPromptShown: () => void;
  recordManualRateTap: () => void;
  recordShieldShown: (atMs: number) => void;
  reset: () => void;
};

export const REVIEW_PROMPT_STORAGE_KEY = "excerlock.review-prompt.v1";

export const useReviewPromptStore = create<ReviewPromptStore>()(
  persist(
    (set) => ({
      ...DEFAULT_REVIEW_PROMPT_STATE,
      ensureInstallTimestamp: (atMs) =>
        set((state) => state.installedAtMs === null ? { installedAtMs: atMs } : {}),
      recordUnlockMoment: () =>
        set((state) => ({ unlockMomentCount: state.unlockMomentCount + 1 })),
      recordPromptShown: () =>
        set((state) => ({ promptCount: Math.min(3, state.promptCount + 1) })),
      recordManualRateTap: () => set({ manualRateTapped: true }),
      recordShieldShown: (atMs) => set({ lastShieldShownAtMs: atMs }),
      reset: () => set(DEFAULT_REVIEW_PROMPT_STATE),
    }),
    {
      name: REVIEW_PROMPT_STORAGE_KEY,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: ({
        installedAtMs,
        unlockMomentCount,
        promptCount,
        manualRateTapped,
        lastShieldShownAtMs,
      }) => ({
        installedAtMs,
        unlockMomentCount,
        promptCount,
        manualRateTapped,
        lastShieldShownAtMs,
      }),
    },
  ),
);
