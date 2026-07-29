import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import {
  ALL_DAYS_ACTIVE,
  type HolidayRange,
  type OverrideDirection,
  type ScheduleRules,
  type Weekday,
} from "../model/scheduleRules";
import { readPersistedSchedule } from "./scheduleStorePersistence";

type ScheduleStore = ScheduleRules & {
  setRecurringRestDay: (weekday: Weekday, isRest: boolean) => void;
  addHoliday: (holiday: HolidayRange) => void;
  removeHoliday: (holiday: HolidayRange) => void;
  setDayOverride: (
    dayIndex: number,
    direction: OverrideDirection,
  ) => void;
  removeDayOverride: (dayIndex: number) => void;
};

export const SCHEDULE_STORAGE_KEY = "excerlock.schedule.v1";

export const useScheduleStore = create<ScheduleStore>()(
  persist(
    (set) => ({
      ...ALL_DAYS_ACTIVE,

      setRecurringRestDay: (weekday, isRest) => {
        set(({ recurringRestWeekdays }) => ({
          recurringRestWeekdays: isRest
            ? [...new Set([...recurringRestWeekdays, weekday])].sort()
            : recurringRestWeekdays.filter(
                (candidate) => candidate !== weekday,
              ),
        }));
      },

      addHoliday: (holiday) => {
        set(({ holidays }) => ({
          holidays: holidays.some(
            ({ startDayIndex, endDayIndex }) =>
              startDayIndex === holiday.startDayIndex &&
              endDayIndex === holiday.endDayIndex,
          )
            ? holidays
            : [...holidays, holiday].sort(compareHolidayRanges),
        }));
      },

      removeHoliday: (holiday) => {
        set(({ holidays }) => ({
          holidays: holidays.filter(
            ({ startDayIndex, endDayIndex }) =>
              startDayIndex !== holiday.startDayIndex ||
              endDayIndex !== holiday.endDayIndex,
          ),
        }));
      },

      setDayOverride: (dayIndex, direction) => {
        set(({ overrides }) => ({
          overrides: [
            ...overrides.filter(
              (candidate) => candidate.dayIndex !== dayIndex,
            ),
            { dayIndex, direction },
          ].sort((a, b) => a.dayIndex - b.dayIndex),
        }));
      },

      removeDayOverride: (dayIndex) => {
        set(({ overrides }) => ({
          overrides: overrides.filter(
            (candidate) => candidate.dayIndex !== dayIndex,
          ),
        }));
      },
    }),
    {
      name: SCHEDULE_STORAGE_KEY,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: ({
        recurringRestWeekdays,
        holidays,
        overrides,
      }) => ({
        recurringRestWeekdays,
        holidays,
        overrides,
      }),
      merge: (persistedState, currentState) => ({
        ...currentState,
        ...readPersistedSchedule(persistedState),
      }),
    },
  ),
);

function compareHolidayRanges(a: HolidayRange, b: HolidayRange): number {
  return (
    a.startDayIndex - b.startDayIndex ||
    a.endDayIndex - b.endDayIndex
  );
}
