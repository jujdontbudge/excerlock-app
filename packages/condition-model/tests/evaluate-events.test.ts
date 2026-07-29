import { describe, expect, it } from "vitest";

import {
  EVALUATION_TIMELINES,
  evaluateCondition,
  type EventCondition,
  type SignalTimelineRow,
} from "../index";

function eventCondition(
  overrides: Partial<EventCondition> = {},
): EventCondition {
  return {
    id: "step-goal",
    catalogId: "steps-goal",
    source: "appleHealth",
    settings: {
      kind: "event",
      threshold: 5_000,
      reward: { type: "fixedMinutes", minutes: 20 },
      repeatable: false,
      perDayCap: 1,
      cooldownMs: 0,
    },
    ...overrides,
  };
}

describe("event condition evaluation", () => {
  it("fires once when a cumulative signal crosses its threshold", () => {
    expect(
      evaluateCondition(
        eventCondition(),
        EVALUATION_TIMELINES.stepGoalCrossing,
        { dayStartMs: 0, nowMs: 10_000 },
      ),
    ).toEqual([
      {
        type: "eventFired",
        atMs: 2_000,
        conditionId: "step-goal",
        sourceEventId: "steps-2",
        reward: { type: "fixedMinutes", minutes: 20 },
      },
    ]);
  });

  it("ignores rows from another source, another day, or the future", () => {
    const rows: SignalTimelineRow[] = [
      {
        atMs: 900,
        event: "signalSnapshot",
        payload: {
          sampleId: "yesterday",
          signal: "steps",
          source: "appleHealth",
          value: 10_000,
        },
      },
      {
        atMs: 1_100,
        event: "signalSnapshot",
        payload: {
          sampleId: "oura",
          signal: "steps",
          source: "oura",
          value: 10_000,
        },
      },
      {
        atMs: 3_000,
        event: "signalSnapshot",
        payload: {
          sampleId: "future",
          signal: "steps",
          source: "appleHealth",
          value: 10_000,
        },
      },
    ];

    expect(
      evaluateCondition(eventCondition(), rows, {
        dayStartMs: 1_000,
        nowMs: 2_000,
      }),
    ).toEqual([]);
  });

  it("deduplicates occurrences and applies repeatability, cooldown, and cap", () => {
    const condition = eventCondition({
      id: "gym-arrival",
      catalogId: "gym-arrival",
      source: "location",
      placeId: "gym-one",
      settings: {
        kind: "event",
        reward: { type: "restOfDay" },
        repeatable: true,
        perDayCap: 2,
        cooldownMs: 60_000,
      },
    });

    expect(
      evaluateCondition(
        condition,
        EVALUATION_TIMELINES.repeatedGymArrivals,
        { dayStartMs: 0, nowMs: 200_000 },
      ),
    ).toEqual([
      {
        type: "eventFired",
        atMs: 1_000,
        conditionId: "gym-arrival",
        sourceEventId: "arrival-a",
        reward: { type: "restOfDay" },
      },
      {
        type: "eventFired",
        atMs: 70_000,
        conditionId: "gym-arrival",
        sourceEventId: "arrival-c",
        reward: { type: "restOfDay" },
      },
    ]);
  });

  it("uses an occurrence value for per-workout thresholds", () => {
    const condition = eventCondition({
      id: "workout",
      catalogId: "workout-duration-goal",
      settings: {
        kind: "event",
        threshold: 30,
        reward: { type: "setPeriod", durationMinutes: 45 },
        repeatable: true,
        perDayCap: null,
        cooldownMs: 0,
      },
    });
    const rows: SignalTimelineRow[] = [
      {
        atMs: 1_000,
        event: "signalOccurrence",
        payload: {
          occurrenceId: "short",
          signal: "workoutDuration",
          source: "appleHealth",
          value: 20,
        },
      },
      {
        atMs: 2_000,
        event: "signalOccurrence",
        payload: {
          occurrenceId: "long",
          signal: "workoutDuration",
          source: "appleHealth",
          value: 35,
        },
      },
    ];

    expect(
      evaluateCondition(condition, rows, { dayStartMs: 0, nowMs: 3_000 }),
    ).toEqual([
      {
        type: "eventFired",
        atMs: 2_000,
        conditionId: "workout",
        sourceEventId: "long",
        reward: { type: "setPeriod", durationMinutes: 45 },
      },
    ]);
  });
});
