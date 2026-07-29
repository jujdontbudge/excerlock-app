import { formatDayCount, formatMinutes, formatSignedMinutes } from "../model/format";

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

describe("formatDayCount", () => {
  it("reads as a fraction of the days on record", () => {
    expect(formatDayCount(5, 7)).toBe("5 of 7 days");
    expect(formatDayCount(1, 1)).toBe("1 of 1 day");
  });
});
