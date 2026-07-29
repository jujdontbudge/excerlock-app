import {
  formatDayCount,
  formatMinutes,
  formatSignedMinutes,
  heroReading,
} from "../model/format";

describe("formatMinutes", () => {
  it.each([
    [0, "0m"],
    [9, "9m"],
    [59, "59m"],
    [60, "1h"],
    [125, "2h 5m"],
    [1440, "24h"],
  ])("reads %i minutes as %s", (minutes, expected) => {
    expect(formatMinutes(minutes)).toBe(expected);
  });

  it("never renders a negative reading", () => {
    expect(formatMinutes(-30)).toBe("0m");
  });
});

describe("formatSignedMinutes", () => {
  it("keeps the sign that carries the meaning", () => {
    expect(formatSignedMinutes(45)).toBe("+45m");
    expect(formatSignedMinutes(-70)).toBe("−1h 10m");
    expect(formatSignedMinutes(0)).toBe("0m");
  });
});

describe("heroReading", () => {
  it("splits a big number into the numeral and its unit", () => {
    expect(heroReading(3882)).toEqual({ value: "64", unit: "h" });
    expect(heroReading(60)).toEqual({ value: "1", unit: "h" });
  });

  it("stays in minutes below the first hour", () => {
    expect(heroReading(45)).toEqual({ value: "45", unit: "m" });
    expect(heroReading(0)).toEqual({ value: "0", unit: "m" });
  });

  it("never renders a negative hero", () => {
    expect(heroReading(-120)).toEqual({ value: "0", unit: "m" });
  });
});

describe("formatDayCount", () => {
  it("reads as a fraction of the days on record", () => {
    expect(formatDayCount(5, 7)).toBe("5 of 7 days");
    expect(formatDayCount(1, 1)).toBe("1 of 1 day");
  });
});
