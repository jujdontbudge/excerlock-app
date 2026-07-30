import {
  classifyScheduleDay,
  type ScheduleRules,
} from "@/schedule";

import { FIXTURE_DAY_SUMMARIES } from "../fixtures";
import { buildRecap } from "../model";

jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);

/** Week 3 used 374 minutes; week 2 used 418. A 4h/day confession is the baseline. */
const BASELINE = 240;

describe("buildRecap", () => {
  it("counts qualifying scheduled-active days against scheduled-active days", () => {
    const schedule: ScheduleRules = {
      recurringRestWeekdays: [2],
      holidays: [],
      overrides: [],
    };
    const recap = buildRecap(FIXTURE_DAY_SUMMARIES, {
      confessedDailyMinutes: BASELINE,
      classifyDay: (dayIndex) =>
        classifyScheduleDay({ dayIndex, schedule }),
    });

    expect(recap).toMatchObject({ activeDays: 6, dayCount: 6 });
  });

  it("keeps every recorded day in the denominator when no schedule exists", () => {
    const recap = buildRecap(FIXTURE_DAY_SUMMARIES, {
      confessedDailyMinutes: BASELINE,
      classifyDay: (dayIndex) => classifyScheduleDay({ dayIndex }),
    });

    expect(recap).toMatchObject({ activeDays: 6, dayCount: 7 });
  });

  it("builds the PRD's five rows over the week containing today", () => {
    const recap = buildRecap(FIXTURE_DAY_SUMMARIES, { confessedDailyMinutes: BASELINE });

    expect(recap).toMatchObject({
      rangeLabel: "20–26 Jul",
      // ① the week's Time Reclaimed…
      reclaimed: { reclaimedMinutes: 7 * BASELINE - 374, status: "measured" },
      // …and its delta against last week's 1262.
      deltaMinutes: 44,
      // ② active days against the days on record.
      activeDays: 6,
      dayCount: 7,
      // ③ activities — one condition-day each (PRD §3.13).
      activityCount: 7,
      // ④ earned against spent.
      earnedMinutes: 221,
      spentMinutes: 374,
      // ⑤ the streak as the week closes.
      streak: { current: 5, longest: 8 },
    });
  });

  it("has no delta to report in a first week, and says so with null", () => {
    const recap = buildRecap(FIXTURE_DAY_SUMMARIES.slice(14), {
      confessedDailyMinutes: BASELINE,
    });

    expect(recap?.deltaMinutes).toBeNull();
  });

  it("reads a down week as a plain negative delta", () => {
    // Week 2 reclaimed 1262 against week 1's 1314 — 52 minutes fewer.
    const recap = buildRecap(FIXTURE_DAY_SUMMARIES.slice(0, 14), {
      confessedDailyMinutes: BASELINE,
    });

    expect(recap?.deltaMinutes).toBe(-52);
  });

  it("still recaps the week when onboarding was skipped", () => {
    const recap = buildRecap(FIXTURE_DAY_SUMMARIES, { confessedDailyMinutes: null });

    expect(recap?.reclaimed.status).toBe("unconfessed");
    expect(recap?.deltaMinutes).toBeNull();
    expect(recap?.activityCount).toBe(7);
    expect(recap?.earnedMinutes).toBe(221);
  });

  it("carries a week that ran over the confession, sign and all", () => {
    const recap = buildRecap(FIXTURE_DAY_SUMMARIES, { confessedDailyMinutes: 30 });

    expect(recap?.reclaimed).toMatchObject({
      reclaimedMinutes: 0,
      netMinutes: -(374 - 7 * 30),
      overDays: 7,
    });
  });

  it("honours the Start-week-on setting", () => {
    const recap = buildRecap(FIXTURE_DAY_SUMMARIES, {
      confessedDailyMinutes: BASELINE,
      weekStartsOn: 0,
    });

    // A Sunday-first week holds only the fixture's last day.
    expect(recap?.rangeLabel).toBe("26 Jul");
    expect(recap?.dayCount).toBe(1);
  });

  it("is null before the first day is recorded — there is no week to recap", () => {
    expect(buildRecap([], { confessedDailyMinutes: BASELINE })).toBeNull();
  });
});
