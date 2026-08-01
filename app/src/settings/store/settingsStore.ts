import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export const GRACE_PERIOD_OPTIONS_SECONDS = [30, 60, 120, 180, 240, 300] as const;

export type GracePeriodSeconds = (typeof GRACE_PERIOD_OPTIONS_SECONDS)[number];
export type WeekStart = 0 | 1;

export type SettingsValues = Readonly<{
  walkAndScrollGracePeriodSeconds: GracePeriodSeconds | null;
  gymAutoDetectEnabled: boolean;
  weekStartsOn: WeekStart;
}>;

export const DEFAULT_SETTINGS: SettingsValues = Object.freeze({
  walkAndScrollGracePeriodSeconds: null,
  gymAutoDetectEnabled: false,
  weekStartsOn: 1,
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

function readPersistedWeekStart(persistedState: unknown): WeekStart {
  if (typeof persistedState !== "object" || persistedState === null) {
    return DEFAULT_SETTINGS.weekStartsOn;
  }
  const value = Reflect.get(persistedState, "weekStartsOn");
  return value === 0 || value === 1 ? value : DEFAULT_SETTINGS.weekStartsOn;
}

type SettingsStore = SettingsValues & {
  setWalkAndScrollGracePeriod: (seconds: GracePeriodSeconds) => void;
  setGymAutoDetectEnabled: (enabled: boolean) => void;
  setWeekStartsOn: (weekday: WeekStart) => void;
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
      setWeekStartsOn: (weekday) => {
        set({ weekStartsOn: weekday });
      },
    }),
    {
      name: SETTINGS_STORAGE_KEY,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: ({ gymAutoDetectEnabled, walkAndScrollGracePeriodSeconds, weekStartsOn }) => ({
        gymAutoDetectEnabled,
        walkAndScrollGracePeriodSeconds,
        weekStartsOn,
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
        weekStartsOn: readPersistedWeekStart(persistedState),
      }),
    },
  ),
);
