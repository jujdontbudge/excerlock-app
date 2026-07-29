import { describe, expect, it } from "vitest";

import {
  EVALUATION_TIMELINES,
  evaluateCondition,
  type RateCondition,
  type SignalTimelineRow,
} from "../index";

function rateCondition(): RateCondition {
  return {
    id: "steps-exchange",
    catalogId: "steps-rate",
    source: "appleHealth",
    settings: {
      kind: "rate",
      reward: {
        type: "proportionalCredit",
        minutesPerUnit: 0.02,
      },
    },
  };
}

describe("rate condition evaluation", () => {
  it("credits every snapshot and delta continuously, including corrections", () => {
    expect(
      evaluateCondition(
        rateCondition(),
        EVALUATION_TIMELINES.stepRateUpdates,
        { dayStartMs: 0, nowMs: 5_000 },
      ),
    ).toEqual([
      {
        type: "rateCredit",
        atMs: 1_000,
        conditionId: "steps-exchange",
        sourceEventId: "rate-snapshot-a",
        signalDelta: 500,
        deltaMinutes: 10,
      },
      {
        type: "rateCredit",
        atMs: 2_000,
        conditionId: "steps-exchange",
        sourceEventId: "rate-delta-a",
        signalDelta: 250,
        deltaMinutes: 5,
      },
      {
        type: "rateCredit",
        atMs: 3_000,
        conditionId: "steps-exchange",
        sourceEventId: "rate-snapshot-b",
        signalDelta: 250,
        deltaMinutes: 5,
      },
      {
        type: "rateCredit",
        atMs: 4_000,
        conditionId: "steps-exchange",
        sourceEventId: "rate-correction",
        signalDelta: -100,
        deltaMinutes: -2,
      },
    ]);
  });

  it("starts each supplied day at zero and does not claim prior-day totals", () => {
    const rows: SignalTimelineRow[] = [
      {
        atMs: 900,
        event: "signalSnapshot",
        payload: {
          sampleId: "prior-day",
          signal: "steps",
          source: "appleHealth",
          value: 10_000,
        },
      },
      {
        atMs: 1_100,
        event: "signalSnapshot",
        payload: {
          sampleId: "today",
          signal: "steps",
          source: "appleHealth",
          value: 100,
        },
      },
    ];

    expect(
      evaluateCondition(rateCondition(), rows, {
        dayStartMs: 1_000,
        nowMs: 2_000,
      }),
    ).toEqual([
      {
        type: "rateCredit",
        atMs: 1_100,
        conditionId: "steps-exchange",
        sourceEventId: "today",
        signalDelta: 100,
        deltaMinutes: 2,
      },
    ]);
  });

  it("emits no outcome when the metric has not changed", () => {
    const rows: SignalTimelineRow[] = [
      {
        atMs: 1_000,
        event: "signalSnapshot",
        payload: {
          sampleId: "zero",
          signal: "steps",
          source: "appleHealth",
          value: 0,
        },
      },
      {
        atMs: 2_000,
        event: "signalDelta",
        payload: {
          sampleId: "no-change",
          signal: "steps",
          source: "appleHealth",
          delta: 0,
        },
      },
    ];

    expect(
      evaluateCondition(rateCondition(), rows, {
        dayStartMs: 0,
        nowMs: 3_000,
      }),
    ).toEqual([]);
  });
});
