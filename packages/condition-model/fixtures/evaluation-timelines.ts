import type { SignalTimelineRow } from "../evaluation-types";

export const EVALUATION_TIMELINES = {
  stepGoalCrossing: [
    {
      atMs: 1_000,
      event: "signalSnapshot",
      payload: {
        sampleId: "steps-1",
        signal: "steps",
        source: "appleHealth",
        value: 4_500,
      },
    },
    {
      atMs: 2_000,
      event: "signalSnapshot",
      payload: {
        sampleId: "steps-2",
        signal: "steps",
        source: "appleHealth",
        value: 5_250,
      },
    },
    {
      atMs: 3_000,
      event: "signalSnapshot",
      payload: {
        sampleId: "steps-3",
        signal: "steps",
        source: "appleHealth",
        value: 7_000,
      },
    },
  ],
  repeatedGymArrivals: [
    {
      atMs: 1_000,
      event: "signalOccurrence",
      payload: {
        occurrenceId: "arrival-a",
        signal: "gymArrival",
        source: "location",
        placeId: "gym-one",
      },
    },
    {
      atMs: 1_100,
      event: "signalOccurrence",
      payload: {
        occurrenceId: "arrival-a",
        signal: "gymArrival",
        source: "location",
        placeId: "gym-one",
      },
    },
    {
      atMs: 20_000,
      event: "signalOccurrence",
      payload: {
        occurrenceId: "arrival-b",
        signal: "gymArrival",
        source: "location",
        placeId: "gym-one",
      },
    },
    {
      atMs: 70_000,
      event: "signalOccurrence",
      payload: {
        occurrenceId: "arrival-c",
        signal: "gymArrival",
        source: "location",
        placeId: "gym-one",
      },
    },
    {
      atMs: 140_000,
      event: "signalOccurrence",
      payload: {
        occurrenceId: "arrival-d",
        signal: "gymArrival",
        source: "location",
        placeId: "gym-one",
      },
    },
  ],
  stepRateUpdates: [
    {
      atMs: 1_000,
      event: "signalSnapshot",
      payload: {
        sampleId: "rate-snapshot-a",
        signal: "steps",
        source: "appleHealth",
        value: 500,
      },
    },
    {
      atMs: 2_000,
      event: "signalDelta",
      payload: {
        sampleId: "rate-delta-a",
        signal: "steps",
        source: "appleHealth",
        delta: 250,
      },
    },
    {
      atMs: 2_100,
      event: "signalDelta",
      payload: {
        sampleId: "rate-delta-a",
        signal: "steps",
        source: "appleHealth",
        delta: 250,
      },
    },
    {
      atMs: 3_000,
      event: "signalSnapshot",
      payload: {
        sampleId: "rate-snapshot-b",
        signal: "steps",
        source: "appleHealth",
        value: 1_000,
      },
    },
    {
      atMs: 4_000,
      event: "signalDelta",
      payload: {
        sampleId: "rate-correction",
        signal: "steps",
        source: "appleHealth",
        delta: -100,
      },
    },
  ],
  walkingWithGrace: [
    {
      atMs: 1_000,
      event: "signalState",
      payload: {
        sampleId: "walking-start",
        signal: "walking",
        source: "motion",
        active: true,
      },
    },
    {
      atMs: 5_000,
      event: "signalState",
      payload: {
        sampleId: "walking-stop-a",
        signal: "walking",
        source: "motion",
        active: false,
      },
    },
    {
      atMs: 7_000,
      event: "signalState",
      payload: {
        sampleId: "walking-resume",
        signal: "walking",
        source: "motion",
        active: true,
      },
    },
    {
      atMs: 10_000,
      event: "signalState",
      payload: {
        sampleId: "walking-stop-b",
        signal: "walking",
        source: "motion",
        active: false,
      },
    },
  ],
} as const satisfies Readonly<Record<string, readonly SignalTimelineRow[]>>;
