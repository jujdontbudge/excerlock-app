import {
  NOTIFICATION_TYPE_IDS,
  NOTIFICATION_TYPES,
  getNotificationType,
} from "../model/catalog";

describe("the §3.14 notification set", () => {
  it("is exactly the three opt-in push types the PRD kept", () => {
    expect(NOTIFICATION_TYPE_IDS).toEqual([
      "afternoonNudge",
      "weeklyRecap",
      "streakLastCall",
    ]);
  });

  it("has no type for a surface the PRD says never pushes", () => {
    const removed = [
      "earnVerified",
      "dayBoundary",
      "balanceLow",
      "balanceEmpty",
      "presenceCooldown",
      "milestoneUnlocked",
    ];

    for (const id of removed) {
      expect(NOTIFICATION_TYPE_IDS).not.toContain(id);
    }
  });

  it("deep-links every type to the surface the PRD names", () => {
    expect(getNotificationType("afternoonNudge").route).toBe("/(tabs)");
    expect(getNotificationType("weeklyRecap").route).toBe("/(tabs)/analysis");
    expect(getNotificationType("streakLastCall").route).toBe("/(tabs)");
  });

  it("exempts only the streak last-call from the one-per-day engagement cap", () => {
    expect(getNotificationType("afternoonNudge").countsAgainstDailyCap).toBe(true);
    expect(getNotificationType("weeklyRecap").countsAgainstDailyCap).toBe(true);
    expect(getNotificationType("streakLastCall").countsAgainstDailyCap).toBe(false);
  });

  it("ranks the weekly recap above the daily nudge when both want the same day", () => {
    const nudge = getNotificationType("afternoonNudge");
    const recap = getNotificationType("weeklyRecap");

    expect(recap.dailyCapPriority).toBeGreaterThan(nudge.dailyCapPriority);
  });

  it("carries a settings row for every type, so all three are silenceable", () => {
    for (const type of NOTIFICATION_TYPES) {
      expect(type.settingsTitle.length).toBeGreaterThan(0);
      expect(type.settingsDescription.length).toBeGreaterThan(0);
    }
  });
});
