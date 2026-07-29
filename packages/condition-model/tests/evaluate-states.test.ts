import { describe, expect, it } from "vitest";

import {
  EVALUATION_TIMELINES,
  evaluateCondition,
  type SignalTimelineRow,
  type StateCondition,
} from "../index";

function stateCondition(exitGraceMs = 3_000): StateCondition {
  return {
    id: "while-walking",
    catalogId: "walking-state",
    source: "motion",
    settings: {
      kind: "state",
      reward: { type: "sustainedUnlock" },
      exitGraceMs,
    },
  };
}

describe("state condition evaluation", () => {
  it("enters once, cancels a recovered exit, and exits after grace", () => {
    expect(
      evaluateCondition(
        stateCondition(),
        EVALUATION_TIMELINES.walkingWithGrace,
        { dayStartMs: 0, nowMs: 15_000 },
      ),
    ).toEqual([
      {
        type: "stateEntered",
        atMs: 1_000,
        conditionId: "while-walking",
        sourceEventId: "walking-start",
      },
      {
        type: "stateExited",
        atMs: 13_000,
        conditionId: "while-walking",
        sourceEventId: "walking-stop-b",
      },
    ]);
  });

  it("does not emit an exit before the caller-supplied clock reaches grace", () => {
    expect(
      evaluateCondition(
        stateCondition(),
        EVALUATION_TIMELINES.walkingWithGrace,
        { dayStartMs: 0, nowMs: 12_000 },
      ),
    ).toEqual([
      {
        type: "stateEntered",
        atMs: 1_000,
        conditionId: "while-walking",
        sourceEventId: "walking-start",
      },
    ]);
  });

  it("exits and can re-enter when recovery happens after grace", () => {
    const rows: SignalTimelineRow[] = [
      {
        atMs: 1_000,
        event: "signalState",
        payload: {
          sampleId: "enter-a",
          signal: "walking",
          source: "motion",
          active: true,
        },
      },
      {
        atMs: 2_000,
        event: "signalState",
        payload: {
          sampleId: "stop-a",
          signal: "walking",
          source: "motion",
          active: false,
        },
      },
      {
        atMs: 6_000,
        event: "signalState",
        payload: {
          sampleId: "enter-b",
          signal: "walking",
          source: "motion",
          active: true,
        },
      },
    ];

    expect(
      evaluateCondition(stateCondition(), rows, {
        dayStartMs: 0,
        nowMs: 7_000,
      }),
    ).toEqual([
      {
        type: "stateEntered",
        atMs: 1_000,
        conditionId: "while-walking",
        sourceEventId: "enter-a",
      },
      {
        type: "stateExited",
        atMs: 5_000,
        conditionId: "while-walking",
        sourceEventId: "stop-a",
      },
      {
        type: "stateEntered",
        atMs: 6_000,
        conditionId: "while-walking",
        sourceEventId: "enter-b",
      },
    ]);
  });

  it("honors source and place boundaries for state rows", () => {
    const condition: StateCondition = {
      id: "gym-presence",
      catalogId: "gym-presence",
      source: "location",
      placeId: "gym-one",
      settings: {
        kind: "state",
        reward: { type: "sustainedUnlock" },
        exitGraceMs: 0,
      },
    };
    const rows: SignalTimelineRow[] = [
      {
        atMs: 1_000,
        event: "signalState",
        payload: {
          sampleId: "wrong-gym",
          signal: "gymPresence",
          source: "location",
          placeId: "gym-two",
          active: true,
        },
      },
      {
        atMs: 2_000,
        event: "signalState",
        payload: {
          sampleId: "right-gym",
          signal: "gymPresence",
          source: "location",
          placeId: "gym-one",
          active: true,
        },
      },
      {
        atMs: 3_000,
        event: "signalState",
        payload: {
          sampleId: "right-gym-exit",
          signal: "gymPresence",
          source: "location",
          placeId: "gym-one",
          active: false,
        },
      },
    ];

    expect(
      evaluateCondition(condition, rows, { dayStartMs: 0, nowMs: 4_000 }),
    ).toEqual([
      {
        type: "stateEntered",
        atMs: 2_000,
        conditionId: "gym-presence",
        sourceEventId: "right-gym",
      },
      {
        type: "stateExited",
        atMs: 3_000,
        conditionId: "gym-presence",
        sourceEventId: "right-gym-exit",
      },
    ]);
  });
});
