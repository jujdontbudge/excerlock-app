import {
  MAX_ENGAGEMENT_PUSHES_PER_DAY,
  MAX_PUSHES_PER_ROLLING_WEEK,
  QUIET_HOURS_END_MINUTE,
  QUIET_HOURS_START_MINUTE,
  ROLLING_WINDOW_MS,
  countInRollingWindow,
  hasRollingWeekHeadroom,
  isWithinQuietHours,
  minuteOfDay,
} from "../model/deliveryRules";
import type { DeliveryRecord } from "../NotificationModule";

const DAY_MS = 24 * 60 * 60 * 1000;
/** A local wall-clock midnight; the ledger's convention, so UTC getters read the wall clock. */
const MIDNIGHT = Date.UTC(2026, 6, 20);

function at(hour: number, minute = 0): number {
  return MIDNIGHT + hour * 60 * 60 * 1000 + minute * 60 * 1000;
}

function delivery(atMs: number, index: number): DeliveryRecord {
  return { id: `delivery-${index}`, typeId: "afternoonNudge", deliveredAtMs: atMs };
}

describe("quiet hours", () => {
  it("is 22:00–07:00 local, per the PRD", () => {
    expect(QUIET_HOURS_START_MINUTE).toBe(22 * 60);
    expect(QUIET_HOURS_END_MINUTE).toBe(7 * 60);
  });

  it("reads the minute of day off a local wall-clock timestamp", () => {
    expect(minuteOfDay(MIDNIGHT)).toBe(0);
    expect(minuteOfDay(at(18))).toBe(18 * 60);
    expect(minuteOfDay(at(23, 59))).toBe(23 * 60 + 59);
  });

  it("silences the whole night, including across midnight", () => {
    expect(isWithinQuietHours(minuteOfDay(at(22)))).toBe(true);
    expect(isWithinQuietHours(minuteOfDay(at(23, 30)))).toBe(true);
    expect(isWithinQuietHours(minuteOfDay(at(0, 1)))).toBe(true);
    expect(isWithinQuietHours(minuteOfDay(at(6, 59)))).toBe(true);
  });

  it("delivers at the boundaries the right way round", () => {
    expect(isWithinQuietHours(QUIET_HOURS_START_MINUTE)).toBe(true);
    expect(isWithinQuietHours(QUIET_HOURS_START_MINUTE - 1)).toBe(false);
    expect(isWithinQuietHours(QUIET_HOURS_END_MINUTE)).toBe(false);
    expect(isWithinQuietHours(QUIET_HOURS_END_MINUTE - 1)).toBe(true);
  });
});

describe("the rolling seven-day ceiling", () => {
  it("is five pushes over seven days", () => {
    expect(MAX_PUSHES_PER_ROLLING_WEEK).toBe(5);
    expect(MAX_ENGAGEMENT_PUSHES_PER_DAY).toBe(1);
    expect(ROLLING_WINDOW_MS).toBe(7 * DAY_MS);
  });

  it("counts only what landed inside the window", () => {
    const now = at(18);
    const deliveries = [
      delivery(now - 8 * DAY_MS, 0),
      delivery(now - 6 * DAY_MS, 1),
      delivery(now - 1 * DAY_MS, 2),
    ];

    expect(countInRollingWindow(deliveries, now)).toBe(2);
  });

  it("drops a delivery the moment it is a full seven days old", () => {
    const now = at(18);
    expect(countInRollingWindow([delivery(now - ROLLING_WINDOW_MS, 0)], now)).toBe(0);
    expect(
      countInRollingWindow([delivery(now - ROLLING_WINDOW_MS + 1, 0)], now),
    ).toBe(1);
  });

  it("has headroom under the ceiling and none at it", () => {
    const now = at(18);
    const four = Array.from({ length: 4 }, (_, index) =>
      delivery(now - (index + 1) * 60_000, index),
    );

    expect(hasRollingWeekHeadroom(four, now)).toBe(true);
    expect(hasRollingWeekHeadroom([...four, delivery(now - 1, 4)], now)).toBe(false);
  });

  it("gives the ceiling no exception, not even to the streak last call", () => {
    const now = at(20);
    const five = Array.from({ length: 5 }, (_, index) => ({
      ...delivery(now - (index + 1) * DAY_MS, index),
      typeId: "streakLastCall" as const,
    }));

    expect(hasRollingWeekHeadroom(five, now)).toBe(false);
  });
});
