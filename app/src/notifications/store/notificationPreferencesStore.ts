import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import { NOTIFICATION_TYPE_IDS, type NotificationTypeId } from "../model/catalog";

/**
 * The silencing model, persisted.
 *
 * PRD §3.14: "the app ships silent. Every notification type defaults OFF." So
 * the default state is not "notifications on with exceptions" — it is a map of
 * `false`, and a type only ever speaks because the user turned that one row on.
 * There is no master switch to hide behind: **each type is its own toggle**, and
 * silencing one is a write to one key that never reads another.
 */

/**
 * The afternoon-nudge wheel. PRD §6 lists "afternoon-nudge time" as a user-set
 * knob and owes no number, so this is the module's picker: the hours an
 * afternoon nudge can honestly be, on the hour. It starts unset — the same
 * no-defaults rule the grace-period picker follows.
 */
export const AFTERNOON_NUDGE_MINUTE_OPTIONS = [
  13 * 60,
  14 * 60,
  15 * 60,
  16 * 60,
  17 * 60,
  18 * 60,
] as const;

export type AfternoonNudgeMinute = (typeof AFTERNOON_NUDGE_MINUTE_OPTIONS)[number];

export type NotificationPreferences = Readonly<{
  enabled: Readonly<Record<NotificationTypeId, boolean>>;
  afternoonNudgeMinuteOfDay: AfternoonNudgeMinute | null;
}>;

const ALL_SILENT: Readonly<Record<NotificationTypeId, boolean>> = Object.freeze(
  Object.fromEntries(NOTIFICATION_TYPE_IDS.map((id) => [id, false])) as Record<
    NotificationTypeId,
    boolean
  >,
);

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences =
  Object.freeze({
    enabled: ALL_SILENT,
    afternoonNudgeMinuteOfDay: null,
  });

export const NOTIFICATION_PREFERENCES_STORAGE_KEY =
  "excerlock.notifications.preferences.v1";

export function isNotificationEnabled(
  preferences: NotificationPreferences,
  id: NotificationTypeId,
): boolean {
  return preferences.enabled[id] === true;
}

function isAfternoonNudgeMinute(value: unknown): value is AfternoonNudgeMinute {
  return (
    typeof value === "number" &&
    (AFTERNOON_NUDGE_MINUTE_OPTIONS as readonly number[]).includes(value)
  );
}

/**
 * Rebuilds the toggle map from exactly the types that exist today. A persisted
 * type the PRD has since removed is dropped rather than carried, and anything
 * that is not literally `true` reads as silent — the safe direction.
 */
function readPersistedEnabled(
  value: unknown,
): Record<NotificationTypeId, boolean> {
  const source = typeof value === "object" && value !== null ? value : {};
  return Object.fromEntries(
    NOTIFICATION_TYPE_IDS.map((id) => [id, Reflect.get(source, id) === true]),
  ) as Record<NotificationTypeId, boolean>;
}

function readPersistedPreferences(persistedState: unknown): NotificationPreferences {
  if (typeof persistedState !== "object" || persistedState === null) {
    return DEFAULT_NOTIFICATION_PREFERENCES;
  }

  const minute = Reflect.get(persistedState, "afternoonNudgeMinuteOfDay");
  return {
    enabled: readPersistedEnabled(Reflect.get(persistedState, "enabled")),
    afternoonNudgeMinuteOfDay: isAfternoonNudgeMinute(minute) ? minute : null,
  };
}

type NotificationPreferencesStore = NotificationPreferences & {
  setNotificationEnabled: (id: NotificationTypeId, enabled: boolean) => void;
  setAfternoonNudgeMinute: (minute: AfternoonNudgeMinute) => void;
};

export const useNotificationPreferencesStore =
  create<NotificationPreferencesStore>()(
    persist(
      (set) => ({
        ...DEFAULT_NOTIFICATION_PREFERENCES,
        setNotificationEnabled: (id, enabled) => {
          set((state) => ({ enabled: { ...state.enabled, [id]: enabled } }));
        },
        setAfternoonNudgeMinute: (minute) => {
          set({ afternoonNudgeMinuteOfDay: minute });
        },
      }),
      {
        name: NOTIFICATION_PREFERENCES_STORAGE_KEY,
        storage: createJSONStorage(() => AsyncStorage),
        partialize: ({ enabled, afternoonNudgeMinuteOfDay }) => ({
          enabled,
          afternoonNudgeMinuteOfDay,
        }),
        merge: (persistedState, currentState) => ({
          ...currentState,
          ...readPersistedPreferences(persistedState),
        }),
      },
    ),
  );
