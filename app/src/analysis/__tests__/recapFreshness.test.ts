import { FIXTURE_DAY_SUMMARIES } from "../fixtures";
import { selectFreshRecap } from "../model";

const BASELINE = 240;

describe("selectFreshRecap", () => {
  it("generates the recap at 18:00 on the last day of the week, not at 17:59", () => {
    const beforeMoment = selectFreshRecap(FIXTURE_DAY_SUMMARIES, {
      nowMs: Date.UTC(2026, 6, 26, 17, 59),
      confessedDailyMinutes: BASELINE,
    });
    const atMoment = selectFreshRecap(FIXTURE_DAY_SUMMARIES, {
      nowMs: Date.UTC(2026, 6, 26, 18),
      confessedDailyMinutes: BASELINE,
    });

    expect(beforeMoment).toBeNull();
    expect(atMoment).toMatchObject({ rangeLabel: "20–26 Jul" });
  });

  it("keeps the recap for hour 71 and collapses it by hour 73", () => {
    const atHour71 = selectFreshRecap(FIXTURE_DAY_SUMMARIES, {
      nowMs: Date.UTC(2026, 6, 29, 17),
      confessedDailyMinutes: BASELINE,
    });
    const atHour73 = selectFreshRecap(FIXTURE_DAY_SUMMARIES, {
      nowMs: Date.UTC(2026, 6, 29, 19),
      confessedDailyMinutes: BASELINE,
    });

    expect(atHour71).toMatchObject({ rangeLabel: "20–26 Jul" });
    expect(atHour73).toBeNull();
  });
});
