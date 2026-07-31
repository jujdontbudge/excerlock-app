import type { ConfiguredCondition } from "@excerlock/condition-model";

import { resolveCheapestUnlockOffer } from "../unlockOffer";

const stepGoal: ConfiguredCondition = {
  id: "step-goal",
  catalogId: "steps-goal",
  source: "appleHealth",
  settings: {
    kind: "event",
    threshold: 10_000,
    reward: { type: "fixedMinutes", minutes: 30 },
    repeatable: false,
    perDayCap: null,
    cooldownMs: 0,
  },
};

const stepsExchange: ConfiguredCondition = {
  id: "step-rate",
  catalogId: "steps-rate",
  source: "appleHealth",
  settings: {
    kind: "rate",
    reward: { type: "proportionalCredit", minutesPerUnit: 0.02 },
  },
};

describe("resolveCheapestUnlockOffer", () => {
  it("chooses the lower real cost when offers use the same signal unit", () => {
    expect(
      resolveCheapestUnlockOffer({
        cause: "balanceEmpty",
        conditions: [stepsExchange, stepGoal],
        reading: { totals: { steps: 8_000 }, activeSignals: [] },
      }),
    ).toBe("1,000 steps gets you 20 more minutes.");
  });

  it("uses the user's real rate quantum and payout", () => {
    expect(
      resolveCheapestUnlockOffer({
        cause: "fullLock",
        conditions: [stepsExchange],
        reading: { totals: {}, activeSignals: [] },
      }),
    ).toBe("1,000 steps gets you 20 more minutes.");
  });

  it("keeps the decided walk-ended offer", () => {
    expect(
      resolveCheapestUnlockOffer({
        cause: "walkAndScrollEnded",
        conditions: [],
        reading: { totals: {}, activeSignals: [] },
      }),
    ).toBe("Start walking again to pick up where you left off.");
  });

  it("uses the real lock-window boundary", () => {
    expect(
      resolveCheapestUnlockOffer({
        cause: "lockWindow",
        conditions: [],
        reading: { totals: {}, activeSignals: [] },
        lockWindowEndsAtMs: Date.UTC(2026, 6, 31, 7),
      }),
    ).toBe("Back at 7:00 AM.");
  });
});
