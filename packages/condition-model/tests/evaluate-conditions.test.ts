import { describe, expect, it } from "vitest";

import {
  evaluateConditions,
  type ConfiguredCondition,
  type SignalTimelineRow,
} from "../index";

describe("condition-set evaluation", () => {
  it("merges every condition's outcomes into chronological domain data", () => {
    const conditions: ConfiguredCondition[] = [
      {
        id: "gym-arrival",
        catalogId: "gym-arrival",
        source: "location",
        placeId: "gym-one",
        settings: {
          kind: "event",
          reward: { type: "fixedMinutes", minutes: 20 },
          repeatable: false,
          perDayCap: 1,
          cooldownMs: 0,
        },
      },
      {
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
      },
    ];
    const timeline: SignalTimelineRow[] = [
      {
        atMs: 2_000,
        event: "signalOccurrence",
        payload: {
          occurrenceId: "arrival",
          signal: "gymArrival",
          source: "location",
          placeId: "gym-one",
        },
      },
      {
        atMs: 1_000,
        event: "signalDelta",
        payload: {
          sampleId: "steps",
          signal: "steps",
          source: "appleHealth",
          delta: 500,
        },
      },
    ];

    expect(
      evaluateConditions(conditions, timeline, {
        dayStartMs: 0,
        nowMs: 3_000,
      }),
    ).toEqual([
      {
        type: "rateCredit",
        atMs: 1_000,
        conditionId: "steps-exchange",
        sourceEventId: "steps",
        signalDelta: 500,
        deltaMinutes: 10,
      },
      {
        type: "eventFired",
        atMs: 2_000,
        conditionId: "gym-arrival",
        sourceEventId: "arrival",
        reward: { type: "fixedMinutes", minutes: 20 },
      },
    ]);
  });
});
