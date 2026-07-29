import {
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
});
