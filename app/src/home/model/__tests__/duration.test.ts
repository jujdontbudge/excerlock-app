import { UNLIMITED } from "@excerlock/ledger";

import { formatCount, formatMinutes, formatQuantity, heroBalance } from "../duration";

describe("formatMinutes", () => {
  it("writes sub-hour balances in minutes", () => {
    expect(formatMinutes(0)).toBe("0m");
    expect(formatMinutes(45)).toBe("45m");
  });

  it("writes hour-and-minute balances the way the mockup does", () => {
    expect(formatMinutes(60)).toBe("1h 0m");
    expect(formatMinutes(134)).toBe("2h 14m");
  });

  it("floors fractional minutes rather than inventing time", () => {
    expect(formatMinutes(20.9)).toBe("20m");
  });

  it("never shows a negative balance", () => {
    expect(formatMinutes(-5)).toBe("0m");
  });

  it("names an unset allowance instead of printing infinity", () => {
    expect(formatMinutes(UNLIMITED)).toBe("Unlimited");
  });
});

describe("heroBalance", () => {
  it("splits a sub-hour balance into numeral and unit", () => {
    expect(heroBalance(45)).toEqual({ value: "45", unit: "min left" });
  });

  it("uses a clock face once there is an hour to show", () => {
    expect(heroBalance(134)).toEqual({ value: "2:14", unit: "hrs left" });
  });

  it("pads the minute half of the clock face", () => {
    expect(heroBalance(65)).toEqual({ value: "1:05", unit: "hrs left" });
  });

  it("shows zero rather than an empty hero", () => {
    expect(heroBalance(0)).toEqual({ value: "0", unit: "min left" });
  });

  it("shows an unset allowance as unlimited", () => {
    expect(heroBalance(UNLIMITED)).toEqual({ value: "∞", unit: "no limit set" });
  });
});

describe("formatCount", () => {
  it("groups thousands", () => {
    expect(formatCount(6_240)).toBe("6,240");
    expect(formatCount(940)).toBe("940");
    expect(formatCount(1_234_567)).toBe("1,234,567");
  });
});

describe("formatQuantity", () => {
  it("names every picker unit", () => {
    expect(formatQuantity(6_240, "step")).toBe("6,240 steps");
    expect(formatQuantity(1, "step")).toBe("1 step");
    expect(formatQuantity(5, "kilometer")).toBe("5 km");
    expect(formatQuantity(3, "mile")).toBe("3 mi");
    expect(formatQuantity(1_000, "meter")).toBe("1,000 m");
    expect(formatQuantity(100, "yard")).toBe("100 yd");
    expect(formatQuantity(700, "kilocalorie")).toBe("700 kcal");
    expect(formatQuantity(30, "minute")).toBe("30 min");
    expect(formatQuantity(14, "strain")).toBe("14 strain");
  });

  it("keeps one decimal for a fractional distance", () => {
    expect(formatQuantity(2.5, "kilometer")).toBe("2.5 km");
  });
});
