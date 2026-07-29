import { FIXTURE_DAY_SUMMARIES } from "../fixtures";
import { dayRangeLabel, sameMonth } from "../model/calendar";

const WEEK_THREE = FIXTURE_DAY_SUMMARIES.slice(14);

describe("dayRangeLabel", () => {
  it("names a week inside one month once", () => {
    expect(dayRangeLabel(WEEK_THREE[0], WEEK_THREE.at(-1)!)).toBe("20–26 Jul");
  });

  it("names both months when the week straddles them", () => {
    // Epoch days 30 and 32 are 31 Jan and 2 Feb 1970.
    const at = (dayIndex: number) => ({ dayIndex, dayStartMs: dayIndex * 86_400_000 });

    expect(dayRangeLabel(at(30), at(32))).toBe("31 Jan – 2 Feb");
  });

  it("reads a single day as that day", () => {
    expect(dayRangeLabel(WEEK_THREE[0], WEEK_THREE[0])).toBe("20 Jul");
  });
});

describe("sameMonth", () => {
  it("is true within a month and false across one", () => {
    const at = (dayIndex: number) => ({ dayIndex, dayStartMs: dayIndex * 86_400_000 });

    expect(sameMonth(at(29), at(30))).toBe(true);
    expect(sameMonth(at(30), at(31))).toBe(false);
  });
});
