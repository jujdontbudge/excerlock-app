import { classifyScheduleDay } from "../model/classifyScheduleDay";

describe("classifyScheduleDay", () => {
  it("treats every day as scheduled active when no schedule exists", () => {
    expect(classifyScheduleDay({ dayIndex: 20_303 })).toEqual({
      kind: "scheduledActive",
      isActive: true,
    });
  });
});
