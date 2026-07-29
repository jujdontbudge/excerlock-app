import { classifyScheduleDay } from "../model/classifyScheduleDay";
import {
  formatCalendarDate,
  parseCalendarDate,
} from "../model/calendarDates";

describe("schedule calendar dates", () => {
  it("keeps every day in a multi-day holiday range, including both edges", () => {
    const start = parseCalendarDate("2026-12-30");
    const end = parseCalendarDate("2027-01-02");
    if (start === undefined || end === undefined) {
      throw new Error("known calendar fixtures must parse");
    }
    const schedule = {
      recurringRestWeekdays: [],
      holidays: [{ startDayIndex: start, endDayIndex: end }],
      overrides: [],
    } as const;

    expect(formatCalendarDate(start)).toBe("2026-12-30");
    expect(formatCalendarDate(end)).toBe("2027-01-02");
    expect(classifyScheduleDay({ dayIndex: start - 1, schedule }).kind).toBe(
      "scheduledActive",
    );
    expect(classifyScheduleDay({ dayIndex: start, schedule }).kind).toBe(
      "holiday",
    );
    expect(classifyScheduleDay({ dayIndex: start + 1, schedule }).kind).toBe(
      "holiday",
    );
    expect(classifyScheduleDay({ dayIndex: end, schedule }).kind).toBe(
      "holiday",
    );
    expect(classifyScheduleDay({ dayIndex: end + 1, schedule }).kind).toBe(
      "scheduledActive",
    );
  });
});
