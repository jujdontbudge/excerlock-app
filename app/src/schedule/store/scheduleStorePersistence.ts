import {
  ALL_DAYS_ACTIVE,
  type DayOverride,
  type HolidayRange,
  type ScheduleRules,
  type Weekday,
} from "../model/scheduleRules";

export function readPersistedSchedule(
  persistedState: unknown,
): ScheduleRules {
  if (typeof persistedState !== "object" || persistedState === null) {
    return ALL_DAYS_ACTIVE;
  }

  const restWeekdays = readRestWeekdays(
    Reflect.get(persistedState, "recurringRestWeekdays"),
  );
  const holidays = readHolidays(Reflect.get(persistedState, "holidays"));
  const overrides = readOverrides(Reflect.get(persistedState, "overrides"));

  return {
    recurringRestWeekdays: restWeekdays,
    holidays,
    overrides,
  };
}

function readRestWeekdays(value: unknown): Weekday[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return [...new Set(value.filter(isWeekday))].sort((a, b) => a - b);
}

function isWeekday(value: unknown): value is Weekday {
  return Number.isInteger(value) && typeof value === "number" && value >= 0 && value <= 6;
}

function readHolidays(value: unknown): HolidayRange[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const unique = new Map<string, HolidayRange>();
  for (const candidate of value) {
    if (isHolidayRange(candidate)) {
      unique.set(
        `${candidate.startDayIndex}:${candidate.endDayIndex}`,
        candidate,
      );
    }
  }
  return [...unique.values()].sort(
    (a, b) =>
      a.startDayIndex - b.startDayIndex ||
      a.endDayIndex - b.endDayIndex,
  );
}

function isHolidayRange(value: unknown): value is HolidayRange {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const startDayIndex = Reflect.get(value, "startDayIndex");
  const endDayIndex = Reflect.get(value, "endDayIndex");
  return (
    Number.isSafeInteger(startDayIndex) &&
    Number.isSafeInteger(endDayIndex) &&
    (startDayIndex as number) <= (endDayIndex as number)
  );
}

function readOverrides(value: unknown): DayOverride[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const byDay = new Map<number, DayOverride>();
  for (const candidate of value) {
    if (isDayOverride(candidate)) {
      byDay.set(candidate.dayIndex, candidate);
    }
  }
  return [...byDay.values()].sort((a, b) => a.dayIndex - b.dayIndex);
}

function isDayOverride(value: unknown): value is DayOverride {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const dayIndex = Reflect.get(value, "dayIndex");
  const direction = Reflect.get(value, "direction");
  return (
    Number.isSafeInteger(dayIndex) &&
    (direction === "active" || direction === "rest")
  );
}
