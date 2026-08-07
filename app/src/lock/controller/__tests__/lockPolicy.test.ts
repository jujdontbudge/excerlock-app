import {
  appendEntries,
  emptyJournal,
  type Journal,
  type LedgerConfig,
} from "@excerlock/ledger";

import { desiredLockState } from "../lockPolicy";

const NOW = 10 * 86_400_000 + 15 * 3_600_000;

const FULL_LOCK_CONFIG: LedgerConfig = {
  dayBoundaryOffsetMinutes: 0,
  baseAllowanceMinutes: 0,
  rollover: null,
};

function restOfDayEarn(atMs: number): Journal {
  return appendEntries(emptyJournal(), [
    {
      kind: "earn",
      source: "test",
      id: "workout:10",
      atMs,
      conditionId: "workout",
      payout: { type: "restOfDay" },
    },
  ]).journal;
}

function policyAt(journal: Journal, atMs: number) {
  return desiredLockState({
    journal,
    config: FULL_LOCK_CONFIG,
    atMs,
    definitions: [],
    fullLock: false,
    walking: false,
  });
}

describe("desiredLockState rest-of-day holidays (device-smoke Finding 9)", () => {
  it("keeps shields up on an empty day with a zero base allowance", () => {
    const { decision } = policyAt(emptyJournal(), NOW);

    expect(decision.shields).toBe("up");
    expect(decision.cause).toBe("emptyBalance");
  });

  it("holds shields down for the rest of the day after a restOfDay payout", () => {
    const journal = restOfDayEarn(NOW - 17 * 60_000);

    const { decision, desired } = policyAt(journal, NOW);

    expect(decision.shields).toBe("down");
    expect(desired.shields).toBe("down");
    // Holiday time is free: nothing to drain, so no thresholds are armed.
    expect(desired.drainThresholds).toEqual([]);
  });

  it("still honors the holiday hours later, not just at claim time", () => {
    const journal = restOfDayEarn(NOW - 17 * 60_000);
    const eightHoursOn = NOW + 8 * 3_600_000;

    const { decision } = policyAt(journal, eightHoursOn);

    expect(decision.shields).toBe("down");
  });

  it("ends the holiday at the day boundary", () => {
    const journal = restOfDayEarn(NOW - 17 * 60_000);
    const nextMorning = 11 * 86_400_000 + 8 * 3_600_000;

    const { decision } = policyAt(journal, nextMorning);

    expect(decision.shields).toBe("up");
    expect(decision.cause).toBe("emptyBalance");
  });
});
