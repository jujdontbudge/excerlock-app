import { buildMilestoneRows } from "../progress";

describe("buildMilestoneRows", () => {
  it("keeps all 22 badges visible in the three decided ladders", () => {
    const rows = buildMilestoneRows({
      currentStreakDays: 0,
      longestStreakDays: 0,
      activityCount: 0,
      timeReclaimedMinutes: 0,
    });

    expect(rows.map(({ title, badges }) => [title, badges.length])).toEqual([
      ["Streaks", 8],
      ["Activities", 8],
      ["Time Reclaimed", 6],
    ]);
    expect(rows.flatMap(({ badges }) => badges)).toHaveLength(22);
  });

  it("projects unlocked, next-up and locked badges from the real readings", () => {
    const rows = buildMilestoneRows({
      currentStreakDays: 22,
      longestStreakDays: 22,
      activityCount: 7,
      timeReclaimedMinutes: 26 * 60,
    });

    expect(rows[0].badges.map(({ id, state }) => [id, state])).toEqual([
      ["streak-3", "unlocked"],
      ["streak-7", "unlocked"],
      ["streak-14", "unlocked"],
      ["streak-30", "nextUp"],
      ["streak-60", "locked"],
      ["streak-100", "locked"],
      ["streak-180", "locked"],
      ["streak-365", "locked"],
    ]);
    expect(rows[0].badges[3].progress).toEqual({
      current: 22,
      target: 30,
      label: "22/30 days",
      fraction: 22 / 30,
    });

    expect(rows[1].badges.find(({ state }) => state === "nextUp")?.progress).toEqual({
      current: 7,
      target: 10,
      label: "7/10 activities",
      fraction: 0.7,
    });
    expect(rows[2].badges.find(({ state }) => state === "nextUp")?.progress).toEqual({
      current: 26,
      target: 50,
      label: "26/50 hours",
      fraction: 0.52,
    });
  });
});
