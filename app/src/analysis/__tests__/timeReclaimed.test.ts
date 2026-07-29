import { FIXTURE_DAY_SUMMARIES } from "../fixtures";
import { selectTimeReclaimed } from "../model";

/**
 * The fixture burns 1158 minutes of locked-group usage over its 21 days —
 * 366 in week 1, 418 in week 2, 374 in week 3.
 */
const MONTH_USAGE = 1158;
const WEEK_THREE = FIXTURE_DAY_SUMMARIES.slice(14);

describe("selectTimeReclaimed", () => {
  it("sums the PRD formula over the window: max(0, confession − usage) per day", () => {
    // A 4h/day confession against 21 days that used 1158 minutes.
    const reclaimed = selectTimeReclaimed(FIXTURE_DAY_SUMMARIES, 240);

    expect(reclaimed).toMatchObject({
      status: "measured",
      baselineMinutes: 240,
      reclaimedMinutes: 21 * 240 - MONTH_USAGE,
      overMinutes: 0,
      netMinutes: 21 * 240 - MONTH_USAGE,
      usageMinutes: MONTH_USAGE,
      dayCount: 21,
      reclaimedDays: 21,
      overDays: 0,
    });
  });

  it("clamps a blowout day at zero rather than letting it subtract", () => {
    // Week 3 against a 60 min/day confession: four days under it save 59 minutes,
    // and Tue's 71-minute day contributes 0 to the hero — not −11.
    const reclaimed = selectTimeReclaimed(WEEK_THREE, 60);

    expect(reclaimed.reclaimedMinutes).toBe(59);
    expect(reclaimed.overMinutes).toBe(13);
    expect(reclaimed.netMinutes).toBe(46);
    expect(reclaimed.overDays).toBe(2);
    expect(reclaimed.reclaimedDays).toBe(4);
  });

  it("counts a day that lands exactly on the confession as neither saved nor over", () => {
    // Thu 23 Jul used 60 minutes — level with a 60 min/day confession.
    const level = selectTimeReclaimed(FIXTURE_DAY_SUMMARIES.slice(17, 18), 60);

    expect(level).toMatchObject({
      reclaimedMinutes: 0,
      overMinutes: 0,
      netMinutes: 0,
      reclaimedDays: 0,
      overDays: 0,
      dayCount: 1,
    });
  });

  it("reports a negative net truthfully when the window used more than was confessed", () => {
    // A 30 min/day confession: every one of the 21 days ran over it.
    const reclaimed = selectTimeReclaimed(FIXTURE_DAY_SUMMARIES, 30);

    expect(reclaimed).toMatchObject({
      status: "measured",
      reclaimedMinutes: 0,
      overMinutes: MONTH_USAGE - 21 * 30,
      netMinutes: -(MONTH_USAGE - 21 * 30),
      reclaimedDays: 0,
      overDays: 21,
    });
  });

  it("has no baseline at all when onboarding was skipped", () => {
    const reclaimed = selectTimeReclaimed(FIXTURE_DAY_SUMMARIES, null);

    expect(reclaimed).toMatchObject({
      status: "unconfessed",
      baselineMinutes: null,
      reclaimedMinutes: 0,
      overMinutes: 0,
      netMinutes: 0,
      reclaimedDays: 0,
      overDays: 0,
      // The usage is still real and still worth showing.
      usageMinutes: MONTH_USAGE,
      dayCount: 21,
    });
  });

  it("treats a confession of zero as nothing to reclaim against, not as a loss", () => {
    const reclaimed = selectTimeReclaimed(FIXTURE_DAY_SUMMARIES, 0);

    expect(reclaimed).toMatchObject({
      status: "noBaseline",
      baselineMinutes: 0,
      reclaimedMinutes: 0,
      overMinutes: 0,
      netMinutes: 0,
      usageMinutes: MONTH_USAGE,
    });
  });

  it("refuses a nonsensical baseline the same way", () => {
    expect(selectTimeReclaimed(WEEK_THREE, -60).status).toBe("noBaseline");
    expect(selectTimeReclaimed(WEEK_THREE, Number.NaN).status).toBe("noBaseline");
  });

  it("is total over an empty window", () => {
    expect(selectTimeReclaimed([], 240)).toEqual({
      status: "measured",
      baselineMinutes: 240,
      reclaimedMinutes: 0,
      overMinutes: 0,
      netMinutes: 0,
      usageMinutes: 0,
      dayCount: 0,
      reclaimedDays: 0,
      overDays: 0,
    });
  });
});
