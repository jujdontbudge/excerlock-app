import { DAY_MS } from "@excerlock/ledger";

import { FIXTURE_DAY_SUMMARIES, FIXTURE_LEDGER_CONFIG } from "../fixtures";
import { weekdayIndex } from "../model/calendar";

const { baseAllowanceMinutes, rolloverCapMinutes } = FIXTURE_LEDGER_CONFIG;

describe("fixture day summaries", () => {
  it("covers three whole Monday-to-Sunday weeks", () => {
    expect(FIXTURE_DAY_SUMMARIES).toHaveLength(21);
    expect(weekdayIndex(FIXTURE_DAY_SUMMARIES[0])).toBe(1);
    expect(weekdayIndex(FIXTURE_DAY_SUMMARIES[20])).toBe(0);
  });

  it("runs one contiguous ascending day per record", () => {
    FIXTURE_DAY_SUMMARIES.forEach((day, index) => {
      if (index === 0) return;
      const previous = FIXTURE_DAY_SUMMARIES[index - 1];
      expect(day.dayIndex).toBe(previous.dayIndex + 1);
      expect(day.dayStartMs).toBe(previous.dayStartMs + DAY_MS);
    });
  });

  it("keeps the ledger's balance identities on every day", () => {
    let carried = 0;
    for (const day of FIXTURE_DAY_SUMMARIES) {
      expect(day.baseAllowance).toBe(baseAllowanceMinutes);
      expect(day.rolloverIn).toBe(carried);
      expect(day.startBalance).toBe(day.baseAllowance + day.rolloverIn);
      // The balance never goes negative, and nothing is spent that was not there.
      expect(day.spentMinutes).toBeLessThanOrEqual(day.startBalance + day.earnedMinutes);
      expect(day.endBalance).toBe(day.startBalance + day.earnedMinutes - day.spentMinutes);
      expect(day.endBalance).toBeGreaterThanOrEqual(0);
      carried = Math.min(day.endBalance, rolloverCapMinutes);
    }
  });

  it("derives meaningful activity from the package's streak floors", () => {
    for (const day of FIXTURE_DAY_SUMMARIES) {
      const meaningful = Object.values(day.conditions).filter(
        (condition) => condition.meaningfulActivity,
      );
      expect(day.meaningfulConditionCount).toBe(meaningful.length);
      expect(day.meaningfulActivity).toBe(meaningful.length > 0);
    }
  });

  it("tells a story with earning days, burn-to-zero days and gaps", () => {
    const zeroBalanceDays = FIXTURE_DAY_SUMMARIES.filter((day) => day.endBalance === 0);
    const quietDays = FIXTURE_DAY_SUMMARIES.filter((day) => day.earnedMinutes === 0);

    expect(zeroBalanceDays.length).toBeGreaterThanOrEqual(3);
    expect(quietDays.length).toBeGreaterThanOrEqual(3);
    expect(quietDays.every((day) => !day.meaningfulActivity)).toBe(true);
  });
});
