import {
  createMilestoneShareCardInput,
  createRecapShareCardInput,
} from "..";

describe("share-card input construction", () => {
  it("accepts only a date-shaped recap range", () => {
    expect(
      createRecapShareCardInput({
        reclaimedMinutes: 1_306,
        activeDays: 6,
        scheduledActiveDays: 7,
        earnCount: 7,
        weekDateRange: "20–26 Jul",
      }),
    ).toEqual({
      reclaimedMinutes: 1_306,
      activeDays: 6,
      scheduledActiveDays: 7,
      earnCount: 7,
      weekDateRange: "20–26 Jul",
    });

    expect(() =>
      createRecapShareCardInput({
        reclaimedMinutes: 1_306,
        activeDays: 6,
        scheduledActiveDays: 7,
        earnCount: 7,
        weekDateRange: "20–26 Jul · Gym visit",
      }),
    ).toThrow("week date range");
  });

  it("accepts only a milestone-shaped name and month", () => {
    expect(
      createMilestoneShareCardInput({
        milestoneName: "30-Day Streak",
        achievementNumber: 30,
        unlockMonth: "July 2026",
      }),
    ).toEqual({
      milestoneName: "30-Day Streak",
      achievementNumber: 30,
      unlockMonth: "July 2026",
    });

    expect(() =>
      createMilestoneShareCardInput({
        milestoneName: "30-Day Streak · Johan",
        achievementNumber: 30,
        unlockMonth: "July 2026",
      }),
    ).toThrow("milestone name");
    expect(() =>
      createMilestoneShareCardInput({
        milestoneName: "30-Day Streak",
        achievementNumber: 30,
        unlockMonth: "July 2026 · Downtown Fitness",
      }),
    ).toThrow("unlock month");
  });
});
