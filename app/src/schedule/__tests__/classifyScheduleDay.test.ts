import {
  classifyScheduleAt,
  classifyScheduleDay,
  type ScheduleRules,
} from "../model/classifyScheduleDay";

describe("classifyScheduleDay", () => {
  it("treats every day as scheduled active when no schedule exists", () => {
    expect(classifyScheduleDay({ dayIndex: 20_303 })).toEqual({
      kind: "scheduledActive",
      isActive: true,
    });
  });

  it("applies override, holiday, recurring rest, then active precedence in one place", () => {
    const monday = 20_654; // 2026-07-20
    const schedule: ScheduleRules = {
      recurringRestWeekdays: [0],
      holidays: [{ startDayIndex: monday, endDayIndex: monday + 6 }],
      overrides: [
        { dayIndex: monday + 1, direction: "rest" },
        { dayIndex: monday + 6, direction: "active" },
      ],
    };

    expect(classifyScheduleDay({ dayIndex: monday + 6, schedule })).toEqual({
      kind: "override",
      direction: "active",
      isActive: true,
    });
    expect(classifyScheduleDay({ dayIndex: monday + 1, schedule })).toEqual({
      kind: "override",
      direction: "rest",
      isActive: false,
    });
    expect(classifyScheduleDay({ dayIndex: monday + 5, schedule })).toEqual({
      kind: "holiday",
      isActive: false,
    });
    expect(classifyScheduleDay({ dayIndex: monday + 13, schedule })).toEqual({
      kind: "rest",
      isActive: false,
    });
    expect(classifyScheduleDay({ dayIndex: monday + 7, schedule })).toEqual({
      kind: "scheduledActive",
      isActive: true,
    });
  });

  it("uses the ledger boundary at midnight and across a DST clock change", () => {
    const sundayRest: ScheduleRules = {
      recurringRestWeekdays: [0],
      holidays: [],
      overrides: [],
    };
    const atLocal = (year: number, month: number, day: number, hour: number, minute = 0) =>
      Date.UTC(year, month - 1, day, hour, minute);
    const fromEpoch = (epochMs: number, timezoneOffsetMinutes: number) =>
      epochMs - timezoneOffsetMinutes * 60_000;
    const kindAt = (
      localWallClockMs: number,
      dayBoundaryOffsetMinutes: number,
    ) =>
      classifyScheduleAt({
        localWallClockMs,
        dayBoundaryOffsetMinutes,
        schedule: sundayRest,
      }).kind;

    expect(kindAt(atLocal(2026, 7, 25, 23, 59), 0)).toBe("scheduledActive");
    expect(kindAt(atLocal(2026, 7, 26, 0), 0)).toBe("rest");
    expect(kindAt(atLocal(2026, 7, 26, 3, 59), 4 * 60)).toBe(
      "scheduledActive",
    );
    expect(kindAt(atLocal(2026, 7, 26, 4), 4 * 60)).toBe("rest");

    // New York springs from 01:59 EST to 03:00 EDT on 2026-03-08.
    // Converting once at the edge keeps the configured 04:00 ledger boundary.
    const beforeJump = fromEpoch(Date.UTC(2026, 2, 8, 6, 59), 5 * 60);
    const afterJump = fromEpoch(Date.UTC(2026, 2, 8, 7), 4 * 60);
    const atBoundary = fromEpoch(Date.UTC(2026, 2, 8, 8), 4 * 60);

    expect(kindAt(beforeJump, 4 * 60)).toBe("scheduledActive");
    expect(kindAt(afterJump, 4 * 60)).toBe("scheduledActive");
    expect(kindAt(atBoundary, 4 * 60)).toBe("rest");
  });
});
