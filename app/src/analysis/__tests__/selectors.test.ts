import type { DaySummary } from "@excerlock/ledger";

import { FIXTURE_DAY_SUMMARIES } from "../fixtures";
import { weekdayIndex } from "../model/calendar";
import {
  selectBars,
  selectMonth,
  selectPreviousWeek,
  selectStreak,
  selectToday,
  selectTotals,
  selectWeek,
} from "../model/selectors";

/** A throwaway summary — only the fields the selector under test reads are meaningful. */
function day(dayIndex: number, patch: Partial<DaySummary> = {}): DaySummary {
  return {
    dayIndex,
    dayStartMs: dayIndex * 86_400_000,
    baseAllowance: 30,
    rolloverIn: 0,
    startBalance: 30,
    endBalance: 30,
    earnedMinutes: 0,
    spentMinutes: 0,
    usageMinutes: 0,
    holidays: [],
    conditions: {},
    meaningfulActivity: false,
    meaningfulConditionCount: 0,
    ...patch,
  };
}

/** `meaningful` is the streak's per-day predicate; the rest of the day is irrelevant here. */
function streakDays(pattern: readonly boolean[]): DaySummary[] {
  return pattern.map((meaningful, index) =>
    day(index, { meaningfulActivity: meaningful, meaningfulConditionCount: meaningful ? 1 : 0 }),
  );
}

describe("selectToday", () => {
  it("is the last recorded day", () => {
    expect(selectToday(FIXTURE_DAY_SUMMARIES)).toBe(FIXTURE_DAY_SUMMARIES.at(-1));
  });

  it("is null before the first entry exists", () => {
    expect(selectToday([])).toBeNull();
  });
});

describe("selectWeek", () => {
  it("returns the calendar week containing today, Monday-first by default", () => {
    const week = selectWeek(FIXTURE_DAY_SUMMARIES);

    expect(week).toHaveLength(7);
    expect(week.at(-1)).toBe(FIXTURE_DAY_SUMMARIES.at(-1));
    expect(weekdayIndex(week[0])).toBe(1);
  });

  it("honours a Sunday week start", () => {
    const week = selectWeek(FIXTURE_DAY_SUMMARIES, { weekStartsOn: 0 });

    // The fixture ends on a Sunday, so a Sunday-first week has only that one day in it.
    expect(week).toHaveLength(1);
    expect(weekdayIndex(week[0])).toBe(0);
  });

  it("returns a partial week when the ledger starts mid-week", () => {
    const week = selectWeek(FIXTURE_DAY_SUMMARIES.slice(18));

    expect(week).toHaveLength(3);
  });

  it("is empty with no days", () => {
    expect(selectWeek([])).toEqual([]);
  });
});

describe("selectPreviousWeek", () => {
  it("returns the seven days before this week — the recap's delta window", () => {
    const previous = selectPreviousWeek(FIXTURE_DAY_SUMMARIES);

    expect(previous).toHaveLength(7);
    expect(previous).toEqual(FIXTURE_DAY_SUMMARIES.slice(7, 14));
    expect(previous.at(-1)?.dayIndex).toBe(selectWeek(FIXTURE_DAY_SUMMARIES)[0].dayIndex - 1);
  });

  it("is empty when the record does not reach back that far", () => {
    expect(selectPreviousWeek(FIXTURE_DAY_SUMMARIES.slice(14))).toEqual([]);
    expect(selectPreviousWeek([])).toEqual([]);
  });

  it("returns whatever part of that week was recorded", () => {
    // Records from Wed 15 Jul on: the week before this one holds only its last five days.
    expect(selectPreviousWeek(FIXTURE_DAY_SUMMARIES.slice(9))).toHaveLength(5);
  });
});

describe("selectMonth", () => {
  it("returns the calendar month containing today — the hero's window", () => {
    // The whole fixture is July 2026.
    expect(selectMonth(FIXTURE_DAY_SUMMARIES)).toHaveLength(21);
  });

  it("stops at the month boundary", () => {
    // Epoch days 29–32 are 30 Jan, 31 Jan, 1 Feb and 2 Feb 1970.
    const month = selectMonth([day(29), day(30), day(31), day(32)]);

    expect(month.map((each) => each.dayIndex)).toEqual([31, 32]);
  });

  it("is empty with no days", () => {
    expect(selectMonth([])).toEqual([]);
  });
});

describe("selectStreak", () => {
  it("counts the run of meaningful days ending today", () => {
    expect(selectStreak(streakDays([true, true, false, true, true, true])).current).toBe(3);
  });

  it("breaks the current streak the moment today is quiet", () => {
    expect(selectStreak(streakDays([true, true, true, false])).current).toBe(0);
  });

  it("remembers the longest run even when it is over", () => {
    const streak = selectStreak(streakDays([true, true, true, true, false, true]));

    expect(streak.longest).toBe(4);
    expect(streak.current).toBe(1);
  });

  it("never chains across a gap in the record", () => {
    const gapped = [
      day(0, { meaningfulActivity: true }),
      day(1, { meaningfulActivity: true }),
      day(9, { meaningfulActivity: true }),
    ];

    expect(selectStreak(gapped)).toEqual({ current: 1, longest: 2 });
  });

  it("is zero with no days", () => {
    expect(selectStreak([])).toEqual({ current: 0, longest: 0 });
  });

  it("reads the fixture's five-day run and its eight-day best", () => {
    expect(selectStreak(FIXTURE_DAY_SUMMARIES)).toEqual({ current: 5, longest: 8 });
  });
});

describe("selectTotals", () => {
  it("sums earned, spent and usage and reports the difference", () => {
    const totals = selectTotals([
      day(0, { earnedMinutes: 20, spentMinutes: 35, usageMinutes: 35 }),
      day(1, { earnedMinutes: 45, spentMinutes: 12, usageMinutes: 18 }),
    ]);

    expect(totals).toMatchObject({
      earnedMinutes: 65,
      spentMinutes: 47,
      usageMinutes: 53,
      netMinutes: 18,
    });
  });

  it("counts the days that met the bar against the days on record", () => {
    const totals = selectTotals(streakDays([true, false, true]));

    expect(totals.activeDays).toBe(2);
    expect(totals.dayCount).toBe(3);
  });

  it("is all zeros with no days", () => {
    expect(selectTotals([])).toEqual({
      earnedMinutes: 0,
      spentMinutes: 0,
      usageMinutes: 0,
      netMinutes: 0,
      activeDays: 0,
      dayCount: 0,
    });
  });
});

describe("selectBars", () => {
  it("scales every bar against the busiest minute in the window", () => {
    const bars = selectBars([
      day(0, { earnedMinutes: 30, spentMinutes: 60 }),
      day(1, { earnedMinutes: 15, spentMinutes: 0 }),
    ]);

    expect(bars).toHaveLength(2);
    expect(bars[0].earnedFraction).toBeCloseTo(0.5);
    expect(bars[0].spentFraction).toBe(1);
    expect(bars[1].earnedFraction).toBeCloseTo(0.25);
    expect(bars[1].spentFraction).toBe(0);
  });

  it("flattens to zero rather than dividing by zero on an all-quiet window", () => {
    const bars = selectBars([day(0), day(1)]);

    expect(bars.map((bar) => bar.earnedFraction)).toEqual([0, 0]);
    expect(bars.map((bar) => bar.spentFraction)).toEqual([0, 0]);
  });

  it("labels each bar with its weekday initial", () => {
    expect(selectBars(FIXTURE_DAY_SUMMARIES.slice(14)).map((bar) => bar.label)).toEqual([
      "M",
      "T",
      "W",
      "T",
      "F",
      "S",
      "S",
    ]);
  });
});
