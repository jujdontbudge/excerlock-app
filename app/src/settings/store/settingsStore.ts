import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export const GRACE_PERIOD_OPTIONS_SECONDS = [30, 60, 120, 180, 240, 300] as const;

export type GracePeriodSeconds = (typeof GRACE_PERIOD_OPTIONS_SECONDS)[number];

export type SettingsValues = Readonly<{
  walkAndScrollGracePeriodSeconds: GracePeriodSeconds | null;
  gymAutoDetectEnabled: boolean;
}>;

export const DEFAULT_SETTINGS: SettingsValues = Object.freeze({
  walkAndScrollGracePeriodSeconds: null,
  gymAutoDetectEnabled: false,
});

function isGracePeriodSeconds(value: unknown): value is GracePeriodSeconds {
  return (
    typeof value === "number" &&
    (GRACE_PERIOD_OPTIONS_SECONDS as readonly number[]).includes(value)
  );
}

function readPersistedGracePeriod(persistedState: unknown): GracePeriodSeconds | null {
  if (typeof persistedState !== "object" || persistedState === null) {
    return DEFAULT_SETTINGS.walkAndScrollGracePeriodSeconds;
  }

  const value = Reflect.get(persistedState, "walkAndScrollGracePeriodSeconds");
  return value === null || isGracePeriodSeconds(value)
    ? value
    : DEFAULT_SETTINGS.walkAndScrollGracePeriodSeconds;
}

type SettingsStore = SettingsValues & {
  setWalkAndScrollGracePeriod: (seconds: GracePeriodSeconds) => void;
  setGymAutoDetectEnabled: (enabled: boolean) => void;
};

export const SETTINGS_STORAGE_KEY = "excerlock.settings.v1";

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      ...DEFAULT_SETTINGS,
      setWalkAndScrollGracePeriod: (seconds) => {
        set({ walkAndScrollGracePeriodSeconds: seconds });
      },
      setGymAutoDetectEnabled: (enabled) => {
        set({ gymAutoDetectEnabled: enabled });
      },
    }),
    {
      name: SETTINGS_STORAGE_KEY,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: ({ gymAutoDetectEnabled, walkAndScrollGracePeriodSeconds }) => ({
        gymAutoDetectEnabled,
        walkAndScrollGracePeriodSeconds,
      }),
      merge: (persistedState, currentState) => ({
        ...currentState,
        gymAutoDetectEnabled:
          typeof persistedState === "object" &&
          persistedState !== null &&
          typeof Reflect.get(persistedState, "gymAutoDetectEnabled") === "boolean"
            ? Reflect.get(persistedState, "gymAutoDetectEnabled") as boolean
            : DEFAULT_SETTINGS.gymAutoDetectEnabled,
        walkAndScrollGracePeriodSeconds: readPersistedGracePeriod(persistedState),
      }),
    },
  ),
);
