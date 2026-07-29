import {
  STREAK_LAST_CALL_MINUTE_OF_DAY,
  WEEKLY_RECAP_MINUTE_OF_DAY,
  shouldFireAfternoonNudge,
  shouldFireStreakLastCall,
  shouldFireWeeklyRecap,
  weekOffset,
  weekdayIndex,
} from "../model/triggers";
import type { NotificationDayFacts } from "../model/triggers";

/** Day 0 is 1 January 1970, a Thursday, so a weekday is pure arithmetic on the index. */
const THURSDAY = 0;
const SATURDAY = 2;
const SUNDAY = 3;
const MONDAY = 4;

const ACTIVE_DAY: NotificationDayFacts = {
  dayIndex: MONDAY,
  dayStartMs: MONDAY * 24 * 60 * 60 * 1000,
  isActiveDay: true,
  hasQualifyingActivity: false,
  appOpenedToday: false,
  streakRequirementMet: false,
  streakDays: 12,
};

function day(overrides: Partial<NotificationDayFacts>): NotificationDayFacts {
  return { ...ACTIVE_DAY, ...overrides };
}

describe("weekday arithmetic over the ledger day index", () => {
  it("reads day 0 back as a Thursday", () => {
    expect(weekdayIndex(THURSDAY)).toBe(4);
    expect(weekdayIndex(SUNDAY)).toBe(0);
    expect(weekdayIndex(SATURDAY)).toBe(6);
  });

  it("puts the week's last day at offset six, whichever day starts the week", () => {
    expect(weekOffset(SUNDAY, 1)).toBe(6); // Monday-start weeks end on Sunday
    expect(weekOffset(SATURDAY, 0)).toBe(6); // Sunday-start weeks end on Saturday
    expect(weekOffset(MONDAY, 1)).toBe(0);
  });
});

describe("the afternoon nudge trigger", () => {
  it("fires on an active day with no workout yet and the app unopened", () => {
    expect(shouldFireAfternoonNudge(ACTIVE_DAY)).toBe(true);
  });

  it("stays silent on a rest day", () => {
    expect(shouldFireAfternoonNudge(day({ isActiveDay: false }))).toBe(false);
  });

  it("stays silent once the day already has a qualifying activity", () => {
    expect(shouldFireAfternoonNudge(day({ hasQualifyingActivity: true }))).toBe(false);
  });

  it("goes quiet on openers", () => {
    expect(shouldFireAfternoonNudge(day({ appOpenedToday: true }))).toBe(false);
  });
});

describe("the weekly recap trigger", () => {
  it("fires on the last day of the week, aligned to Start week on", () => {
    expect(shouldFireWeeklyRecap(day({ dayIndex: SUNDAY }), { weekStartsOn: 1 })).toBe(true);
    expect(shouldFireWeeklyRecap(day({ dayIndex: SATURDAY }), { weekStartsOn: 0 })).toBe(true);
  });

  it("stays silent on every other day of that week", () => {
    expect(shouldFireWeeklyRecap(day({ dayIndex: SATURDAY }), { weekStartsOn: 1 })).toBe(false);
    expect(shouldFireWeeklyRecap(day({ dayIndex: MONDAY }), { weekStartsOn: 1 })).toBe(false);
  });

  it("is not an engagement push, so opening the app does not cancel it", () => {
    expect(
      shouldFireWeeklyRecap(day({ dayIndex: SUNDAY, appOpenedToday: true }), {
        weekStartsOn: 1,
      }),
    ).toBe(true);
  });

  it("lands at the PRD's 18:00 recap moment", () => {
    expect(WEEKLY_RECAP_MINUTE_OF_DAY).toBe(18 * 60);
  });
});

describe("the streak last-call trigger", () => {
  it("fires when the day's streak requirement is unmet and the app is unopened", () => {
    expect(shouldFireStreakLastCall(ACTIVE_DAY)).toBe(true);
  });

  it("stays silent once the requirement is met", () => {
    expect(shouldFireStreakLastCall(day({ streakRequirementMet: true }))).toBe(false);
  });

  it("goes quiet on openers", () => {
    expect(shouldFireStreakLastCall(day({ appOpenedToday: true }))).toBe(false);
  });

  it("stays silent with no streak to lose, because its own copy would read as zero", () => {
    expect(shouldFireStreakLastCall(day({ streakDays: 0 }))).toBe(false);
    expect(shouldFireStreakLastCall(day({ streakDays: 1 }))).toBe(true);
  });

  it("lands in the evening, clear of quiet hours", () => {
    expect(STREAK_LAST_CALL_MINUTE_OF_DAY).toBe(21 * 60);
    expect(STREAK_LAST_CALL_MINUTE_OF_DAY).toBeLessThan(22 * 60);
  });
});
