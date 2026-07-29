import { FIXTURE_DAY_SUMMARIES } from "../fixtures";
import { buildAnalysisView } from "../model";

describe("buildAnalysisView", () => {
  it("hands the screen a whole week, its totals, its bars and its rows", () => {
    const view = buildAnalysisView(FIXTURE_DAY_SUMMARIES);

    expect(view.isEmpty).toBe(false);
    expect(view.today).toBe(FIXTURE_DAY_SUMMARIES.at(-1));
    expect(view.week).toHaveLength(7);
    expect(view.bars).toHaveLength(7);
    expect(view.weekTotals).toMatchObject({ earnedMinutes: 221, spentMinutes: 374, activeDays: 6 });
    expect(view.streak).toEqual({ current: 5, longest: 8 });
  });

  it("orders the ledger newest first while the chart stays chronological", () => {
    const view = buildAnalysisView(FIXTURE_DAY_SUMMARIES);

    expect(view.ledger[0]).toBe(view.week.at(-1));
    expect(view.ledger.at(-1)).toBe(view.week[0]);
    expect(view.bars[0].dayIndex).toBe(view.week[0].dayIndex);
  });

  it("counts streaks over the whole record, not just this week", () => {
    // The eight-day run ended on Mon 20 Jul — outside week three's totals, inside the streak.
    expect(buildAnalysisView(FIXTURE_DAY_SUMMARIES).streak.longest).toBe(8);
    expect(buildAnalysisView(FIXTURE_DAY_SUMMARIES.slice(14)).streak.longest).toBe(5);
  });

  it("is empty, not zeroed, before the first day is recorded", () => {
    const view = buildAnalysisView([]);

    expect(view.isEmpty).toBe(true);
    expect(view.today).toBeNull();
    expect(view.week).toEqual([]);
    expect(view.bars).toEqual([]);
    expect(view.ledger).toEqual([]);
  });
});
