import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export const MIN_CONFESSED_DAILY_MINUTES = 60;
export const MAX_CONFESSED_DAILY_MINUTES = 12 * 60;

export type ConfessionValues = Readonly<{
  confessedDailyMinutes: number | null;
}>;

export const DEFAULT_CONFESSION: ConfessionValues = Object.freeze({
  confessedDailyMinutes: null,
});

type ConfessionStore = ConfessionValues & {
  setConfessedDailyMinutes: (minutes: number) => void;
};

export const CONFESSION_STORAGE_KEY = "excerlock.onboarding.confession.v1";

function isConfessedDailyMinutes(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= MIN_CONFESSED_DAILY_MINUTES &&
    value <= MAX_CONFESSED_DAILY_MINUTES
  );
}

function readPersistedMinutes(persistedState: unknown): number | null {
  if (typeof persistedState !== "object" || persistedState === null) {
    return DEFAULT_CONFESSION.confessedDailyMinutes;
  }

  const value = Reflect.get(persistedState, "confessedDailyMinutes");
  return isConfessedDailyMinutes(value)
    ? value
    : DEFAULT_CONFESSION.confessedDailyMinutes;
}

export const useConfessionStore = create<ConfessionStore>()(
  persist(
    (set) => ({
      ...DEFAULT_CONFESSION,
      setConfessedDailyMinutes: (minutes) => {
        if (isConfessedDailyMinutes(minutes)) {
          set({ confessedDailyMinutes: minutes });
        }
      },
    }),
    {
      name: CONFESSION_STORAGE_KEY,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: ({ confessedDailyMinutes }) => ({ confessedDailyMinutes }),
      merge: (persistedState, currentState) => ({
        ...currentState,
        confessedDailyMinutes: readPersistedMinutes(persistedState),
      }),
    },
  ),
);
