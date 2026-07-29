import {
  ALL_DAYS_ACTIVE,
  type ScheduleRules,
} from "../model/scheduleRules";

export function readPersistedSchedule(
  persistedState: unknown,
): ScheduleRules {
  if (typeof persistedState !== "object" || persistedState === null) {
    return ALL_DAYS_ACTIVE;
  }

  const state = persistedState as Partial<ScheduleRules>;
  return {
    recurringRestWeekdays: Array.isArray(state.recurringRestWeekdays)
      ? state.recurringRestWeekdays
      : [],
    holidays: Array.isArray(state.holidays) ? state.holidays : [],
    overrides: Array.isArray(state.overrides) ? state.overrides : [],
  };
}
