import type { SignalTimelineRow } from "../index";

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
} as const satisfies Readonly<Record<string, readonly SignalTimelineRow[]>>;
