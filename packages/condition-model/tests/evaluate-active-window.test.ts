import { describe, expect, it } from "vitest";

import {
  evaluateCondition,
  type EventCondition,
  type RateCondition,
  type SignalTimelineRow,
  type StateCondition,
} from "../index";

const MINUTE_MS = 60_000;

describe("condition active windows", () => {
  it("lets event occurrences earn only inside the window", () => {
    const condition: EventCondition = {
      id: "gym-arrival",
      catalogId: "gym-arrival",
      source: "location",
      placeId: "gym-one",
      activeWindow: { startMinute: 60, endMinute: 120 },
      settings: {
        kind: "event",
        reward: { type: "fixedMinutes", minutes: 20 },
        repeatable: true,
        perDayCap: null,
        cooldownMs: 0,
      },
    };
    const rows: SignalTimelineRow[] = [
      {
        atMs: 59 * MINUTE_MS,
        event: "signalOccurrence",
        payload: {
          occurrenceId: "before",
          signal: "gymArrival",
          source: "location",
          placeId: "gym-one",
        },
      },
      {
        atMs: 61 * MINUTE_MS,
        event: "signalOccurrence",
        payload: {
          occurrenceId: "inside",
          signal: "gymArrival",
          source: "location",
          placeId: "gym-one",
        },
      },
      {
        atMs: 121 * MINUTE_MS,
        event: "signalOccurrence",
        payload: {
          occurrenceId: "after",
          signal: "gymArrival",
          source: "location",
          placeId: "gym-one",
        },
      },
    ];

    expect(
      evaluateCondition(condition, rows, {
        dayStartMs: 0,
        nowMs: 180 * MINUTE_MS,
      }),
    ).toEqual([
      {
        type: "eventFired",
        atMs: 61 * MINUTE_MS,
        conditionId: "gym-arrival",
        sourceEventId: "inside",
        reward: { type: "fixedMinutes", minutes: 20 },
      },
    ]);
  });

  it("credits rate deltas only while the window is active", () => {
    const condition: RateCondition = {
      id: "steps-exchange",
      catalogId: "steps-rate",
      source: "appleHealth",
      activeWindow: { startMinute: 60, endMinute: 120 },
      settings: {
        kind: "rate",
        reward: { type: "proportionalCredit", minutesPerUnit: 0.02 },
      },
    };
    const rows: SignalTimelineRow[] = [
      {
        atMs: 59 * MINUTE_MS,
        event: "signalDelta",
        payload: {
          sampleId: "before",
          signal: "steps",
          source: "appleHealth",
          delta: 100,
        },
      },
      {
        atMs: 61 * MINUTE_MS,
        event: "signalDelta",
        payload: {
          sampleId: "inside",
          signal: "steps",
          source: "appleHealth",
          delta: 200,
        },
      },
      {
        atMs: 121 * MINUTE_MS,
        event: "signalDelta",
        payload: {
          sampleId: "after",
          signal: "steps",
          source: "appleHealth",
          delta: 300,
        },
      },
    ];

    expect(
      evaluateCondition(condition, rows, {
        dayStartMs: 0,
        nowMs: 180 * MINUTE_MS,
      }),
    ).toEqual([
      {
        type: "rateCredit",
        atMs: 61 * MINUTE_MS,
        conditionId: "steps-exchange",
        sourceEventId: "inside",
        signalDelta: 200,
        deltaMinutes: 4,
      },
    ]);
  });

  it("uses an outside snapshot as the baseline instead of crediting pre-window totals", () => {
    const condition: RateCondition = {
      id: "steps-exchange",
      catalogId: "steps-rate",
      source: "appleHealth",
      activeWindow: { startMinute: 60, endMinute: 120 },
      settings: {
        kind: "rate",
        reward: { type: "proportionalCredit", minutesPerUnit: 0.02 },
      },
    };
    const rows: SignalTimelineRow[] = [
      {
        atMs: 59 * MINUTE_MS,
        event: "signalSnapshot",
        payload: {
          sampleId: "baseline",
          signal: "steps",
          source: "appleHealth",
          value: 1_000,
        },
      },
      {
        atMs: 61 * MINUTE_MS,
        event: "signalSnapshot",
        payload: {
          sampleId: "inside",
          signal: "steps",
          source: "appleHealth",
          value: 1_200,
        },
      },
    ];

    expect(
      evaluateCondition(condition, rows, {
        dayStartMs: 0,
        nowMs: 90 * MINUTE_MS,
      }),
    ).toEqual([
      {
        type: "rateCredit",
        atMs: 61 * MINUTE_MS,
        conditionId: "steps-exchange",
        sourceEventId: "inside",
        signalDelta: 200,
        deltaMinutes: 4,
      },
    ]);
  });

  it("counts only in-window movement toward a cumulative event threshold", () => {
    const condition: EventCondition = {
      id: "step-goal",
      catalogId: "steps-goal",
      source: "appleHealth",
      activeWindow: { startMinute: 60, endMinute: 120 },
      settings: {
        kind: "event",
        threshold: 500,
        reward: { type: "fixedMinutes", minutes: 20 },
        repeatable: false,
        perDayCap: 1,
        cooldownMs: 0,
      },
    };
    const rows: SignalTimelineRow[] = [
      {
        atMs: 59 * MINUTE_MS,
        event: "signalSnapshot",
        payload: {
          sampleId: "baseline",
          signal: "steps",
          source: "appleHealth",
          value: 1_000,
        },
      },
      {
        atMs: 61 * MINUTE_MS,
        event: "signalSnapshot",
        payload: {
          sampleId: "below",
          signal: "steps",
          source: "appleHealth",
          value: 1_400,
        },
      },
      {
        atMs: 62 * MINUTE_MS,
        event: "signalSnapshot",
        payload: {
          sampleId: "crossing",
          signal: "steps",
          source: "appleHealth",
          value: 1_600,
        },
      },
    ];

    expect(
      evaluateCondition(condition, rows, {
        dayStartMs: 0,
        nowMs: 90 * MINUTE_MS,
      }),
    ).toEqual([
      {
        type: "eventFired",
        atMs: 62 * MINUTE_MS,
        conditionId: "step-goal",
        sourceEventId: "crossing",
        reward: { type: "fixedMinutes", minutes: 20 },
      },
    ]);
  });

  it("enters a live state at window start and exits at window end without grace", () => {
    const condition: StateCondition = {
      id: "while-walking",
      catalogId: "walking-state",
      source: "motion",
      activeWindow: { startMinute: 1, endMinute: 2 },
      settings: {
        kind: "state",
        reward: { type: "sustainedUnlock" },
        exitGraceMs: 5 * MINUTE_MS,
      },
    };
    const rows: SignalTimelineRow[] = [
      {
        atMs: 30_000,
        event: "signalState",
        payload: {
          sampleId: "already-walking",
          signal: "walking",
          source: "motion",
          active: true,
        },
      },
    ];

    expect(
      evaluateCondition(condition, rows, {
        dayStartMs: 0,
        nowMs: 3 * MINUTE_MS,
      }),
    ).toEqual([
      {
        type: "stateEntered",
        atMs: MINUTE_MS,
        conditionId: "while-walking",
        sourceEventId: "while-walking:window-start:60000",
      },
      {
        type: "stateExited",
        atMs: 2 * MINUTE_MS,
        conditionId: "while-walking",
        sourceEventId: "while-walking:window-end:120000",
      },
    ]);
  });

  it("supports windows that cross midnight", () => {
    const condition: EventCondition = {
      id: "overnight-arrival",
      catalogId: "gym-arrival",
      source: "location",
      placeId: "gym-one",
      activeWindow: { startMinute: 22 * 60, endMinute: 6 * 60 },
      settings: {
        kind: "event",
        reward: { type: "restOfDay" },
        repeatable: true,
        perDayCap: null,
        cooldownMs: 0,
      },
    };
    const occurrence = (hour: number, id: string): SignalTimelineRow => ({
      atMs: hour * 60 * MINUTE_MS,
      event: "signalOccurrence",
      payload: {
        occurrenceId: id,
        signal: "gymArrival",
        source: "location",
        placeId: "gym-one",
      },
    });

    expect(
      evaluateCondition(
        condition,
        [
          occurrence(5, "early"),
          occurrence(12, "midday"),
          occurrence(23, "late"),
        ],
        { dayStartMs: 0, nowMs: 24 * 60 * MINUTE_MS - 1 },
      ),
    ).toEqual([
      {
        type: "eventFired",
        atMs: 5 * 60 * MINUTE_MS,
        conditionId: "overnight-arrival",
        sourceEventId: "early",
        reward: { type: "restOfDay" },
      },
      {
        type: "eventFired",
        atMs: 23 * 60 * MINUTE_MS,
        conditionId: "overnight-arrival",
        sourceEventId: "late",
        reward: { type: "restOfDay" },
      },
    ]);
  });
});
