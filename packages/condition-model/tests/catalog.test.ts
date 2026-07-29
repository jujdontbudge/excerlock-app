import { describe, expect, it } from "vitest";

import {
  ACTIVE_MINUTES_SIGNAL,
  CONDITION_CATALOG,
  CONDITION_KINDS,
  EMPTY_START_CONDITIONS,
  STREAK_FLOORS,
} from "../index";

describe("condition kind contract", () => {
  it("locks each kind to exactly one reward family", () => {
    expect(CONDITION_KINDS).toEqual([
      { kind: "state", rewardFamily: "sustainedUnlock" },
      { kind: "event", rewardFamily: "discretePayout" },
      { kind: "rate", rewardFamily: "proportionalCredit" },
    ]);
  });
});

describe("v1 catalog", () => {
  it("contains every decided condition with its kind, signal, and base source", () => {
    expect(
      CONDITION_CATALOG.map(
        ({ id, name, activity, kind, signal, baseSources, placeRequired }) => ({
          id,
          name,
          activity,
          kind,
          signal,
          baseSources,
          placeRequired,
        }),
      ),
    ).toEqual([
      {
        id: "gym-arrival",
        name: "Arrive at gym",
        activity: "gym",
        kind: "event",
        signal: "gymArrival",
        baseSources: ["location"],
        placeRequired: true,
      },
      {
        id: "gym-presence",
        name: "Be at the gym",
        activity: "gym",
        kind: "state",
        signal: "gymPresence",
        baseSources: ["location"],
        placeRequired: true,
      },
      {
        id: "gym-time-rate",
        name: "Time at the gym",
        activity: "gym",
        kind: "rate",
        signal: "gymMinutes",
        baseSources: ["location"],
        placeRequired: true,
      },
      {
        id: "walking-state",
        name: "While walking",
        activity: "walking",
        kind: "state",
        signal: "walking",
        baseSources: ["motion"],
        placeRequired: false,
      },
      {
        id: "steps-rate",
        name: "Steps exchange",
        activity: "walking",
        kind: "rate",
        signal: "steps",
        baseSources: ["appleHealth"],
        placeRequired: false,
      },
      {
        id: "steps-goal",
        name: "Step goal",
        activity: "walking",
        kind: "event",
        signal: "steps",
        baseSources: ["appleHealth"],
        placeRequired: false,
      },
      {
        id: "run-distance-goal",
        name: "Distance goal",
        activity: "running",
        kind: "event",
        signal: "runDistance",
        baseSources: ["appleHealth"],
        placeRequired: false,
      },
      {
        id: "run-distance-rate",
        name: "Distance exchange",
        activity: "running",
        kind: "rate",
        signal: "runDistance",
        baseSources: ["appleHealth"],
        placeRequired: false,
      },
      {
        id: "cycle-distance-goal",
        name: "Distance goal",
        activity: "cycling",
        kind: "event",
        signal: "cycleDistance",
        baseSources: ["appleHealth"],
        placeRequired: false,
      },
      {
        id: "cycle-distance-rate",
        name: "Distance exchange",
        activity: "cycling",
        kind: "rate",
        signal: "cycleDistance",
        baseSources: ["appleHealth"],
        placeRequired: false,
      },
      {
        id: "swim-distance-goal",
        name: "Distance goal",
        activity: "swimming",
        kind: "event",
        signal: "swimDistance",
        baseSources: ["appleHealth"],
        placeRequired: false,
      },
      {
        id: "swim-distance-rate",
        name: "Distance exchange",
        activity: "swimming",
        kind: "rate",
        signal: "swimDistance",
        baseSources: ["appleHealth"],
        placeRequired: false,
      },
      {
        id: "active-calories-goal",
        name: "Active-calorie goal",
        activity: "universal",
        kind: "event",
        signal: "activeCalories",
        baseSources: ["appleHealth"],
        placeRequired: false,
      },
      {
        id: "active-calories-rate",
        name: "Active-calorie exchange",
        activity: "universal",
        kind: "rate",
        signal: "activeCalories",
        baseSources: ["appleHealth"],
        placeRequired: false,
      },
      {
        id: "active-minutes-goal",
        name: "Active-minutes goal",
        activity: "universal",
        kind: "event",
        signal: "activeMinutes",
        baseSources: ["appleHealth"],
        placeRequired: false,
      },
      {
        id: "active-minutes-rate",
        name: "Active-minutes exchange",
        activity: "universal",
        kind: "rate",
        signal: "activeMinutes",
        baseSources: ["appleHealth"],
        placeRequired: false,
      },
      {
        id: "workout-duration-goal",
        name: "Finish any workout",
        activity: "universal",
        kind: "event",
        signal: "workoutDuration",
        baseSources: ["appleHealth"],
        placeRequired: false,
      },
      {
        id: "whoop-strain-goal",
        name: "Hit a strain target",
        activity: "connected",
        kind: "event",
        signal: "whoopStrain",
        baseSources: ["whoop"],
        placeRequired: false,
      },
      {
        id: "hevy-strength-workout",
        name: "Log a strength workout",
        activity: "connected",
        kind: "event",
        signal: "strengthWorkout",
        baseSources: ["hevy"],
        placeRequired: false,
      },
      {
        id: "concept2-row-distance-goal",
        name: "Row X meters",
        activity: "connected",
        kind: "event",
        signal: "rowDistance",
        baseSources: ["concept2"],
        placeRequired: false,
      },
    ]);
  });

  it("carries the exact empty picker ranges and rate quanta", () => {
    expect(
      CONDITION_CATALOG.map(({ id, picker }) => [id, picker]),
    ).toMatchInlineSnapshot(`
      [
        [
          "gym-arrival",
          {
            "initialValue": null,
            "type": "thresholdlessEvent",
          },
        ],
        [
          "gym-presence",
          {
            "initialValue": null,
            "type": "stateGrace",
          },
        ],
        [
          "gym-time-rate",
          {
            "initialValue": null,
            "minutes": {
              "max": 60,
              "min": 5,
              "step": 5,
              "unit": "minute",
            },
            "quantum": {
              "unit": "minute",
              "value": 10,
            },
            "type": "rate",
          },
        ],
        [
          "walking-state",
          {
            "initialValue": null,
            "optionsMs": [
              30000,
              60000,
              120000,
              180000,
              240000,
              300000,
            ],
            "type": "stateGrace",
          },
        ],
        [
          "steps-rate",
          {
            "initialValue": null,
            "minutes": {
              "max": 60,
              "min": 5,
              "step": 5,
              "unit": "minute",
            },
            "quantum": {
              "unit": "step",
              "value": 1000,
            },
            "type": "rate",
          },
        ],
        [
          "steps-goal",
          {
            "initialValue": null,
            "range": {
              "max": 30000,
              "min": 1000,
              "step": 500,
              "unit": "step",
            },
            "type": "threshold",
          },
        ],
        [
          "run-distance-goal",
          {
            "imperialRange": {
              "max": 26,
              "min": 1,
              "step": 0.5,
              "unit": "mile",
            },
            "initialValue": null,
            "range": {
              "max": 42,
              "min": 1,
              "step": 0.5,
              "unit": "kilometer",
            },
            "type": "threshold",
          },
        ],
        [
          "run-distance-rate",
          {
            "imperialQuantum": {
              "unit": "mile",
              "value": 1,
            },
            "initialValue": null,
            "minutes": {
              "max": 60,
              "min": 5,
              "step": 5,
              "unit": "minute",
            },
            "quantum": {
              "unit": "kilometer",
              "value": 1,
            },
            "type": "rate",
          },
        ],
        [
          "cycle-distance-goal",
          {
            "imperialRange": {
              "max": 120,
              "min": 3,
              "step": 3,
              "unit": "mile",
            },
            "initialValue": null,
            "range": {
              "max": 200,
              "min": 5,
              "step": 5,
              "unit": "kilometer",
            },
            "type": "threshold",
          },
        ],
        [
          "cycle-distance-rate",
          {
            "imperialQuantum": {
              "unit": "mile",
              "value": 3,
            },
            "initialValue": null,
            "minutes": {
              "max": 60,
              "min": 5,
              "step": 5,
              "unit": "minute",
            },
            "quantum": {
              "unit": "kilometer",
              "value": 5,
            },
            "type": "rate",
          },
        ],
        [
          "swim-distance-goal",
          {
            "initialValue": null,
            "range": {
              "max": 5000,
              "min": 100,
              "step": 100,
              "unit": "meter",
            },
            "type": "threshold",
          },
        ],
        [
          "swim-distance-rate",
          {
            "imperialQuantum": {
              "unit": "yard",
              "value": 100,
            },
            "initialValue": null,
            "minutes": {
              "max": 60,
              "min": 5,
              "step": 5,
              "unit": "minute",
            },
            "quantum": {
              "unit": "meter",
              "value": 100,
            },
            "type": "rate",
          },
        ],
        [
          "active-calories-goal",
          {
            "initialValue": null,
            "range": {
              "max": 2000,
              "min": 50,
              "step": 50,
              "unit": "kilocalorie",
            },
            "type": "threshold",
          },
        ],
        [
          "active-calories-rate",
          {
            "initialValue": null,
            "minutes": {
              "max": 60,
              "min": 5,
              "step": 5,
              "unit": "minute",
            },
            "quantum": {
              "unit": "kilocalorie",
              "value": 100,
            },
            "type": "rate",
          },
        ],
        [
          "active-minutes-goal",
          {
            "initialValue": null,
            "range": {
              "max": 180,
              "min": 10,
              "step": 5,
              "unit": "minute",
            },
            "type": "threshold",
          },
        ],
        [
          "active-minutes-rate",
          {
            "initialValue": null,
            "minutes": {
              "max": 60,
              "min": 5,
              "step": 5,
              "unit": "minute",
            },
            "quantum": {
              "unit": "minute",
              "value": 10,
            },
            "type": "rate",
          },
        ],
        [
          "workout-duration-goal",
          {
            "initialValue": null,
            "range": {
              "max": 120,
              "min": 10,
              "step": 5,
              "unit": "minute",
            },
            "type": "threshold",
          },
        ],
        [
          "whoop-strain-goal",
          {
            "initialValue": null,
            "range": {
              "max": 20,
              "min": 5,
              "step": 1,
              "unit": "strain",
            },
            "type": "threshold",
          },
        ],
        [
          "hevy-strength-workout",
          {
            "initialValue": null,
            "type": "thresholdlessEvent",
          },
        ],
        [
          "concept2-row-distance-goal",
          {
            "initialValue": null,
            "range": {
              "max": 10000,
              "min": 500,
              "step": 500,
              "unit": "meter",
            },
            "type": "threshold",
          },
        ],
      ]
    `);
  });
});

describe("decided engine data", () => {
  it("starts empty and fixes meaningful-activity floors", () => {
    expect(EMPTY_START_CONDITIONS).toEqual([]);
    expect(STREAK_FLOORS).toEqual({
      rateCreditMinutes: 15,
      stateSustainedMinutes: 10,
    });
  });

  it("selects the Watch active-minutes signal exclusively when present", () => {
    expect(ACTIVE_MINUTES_SIGNAL).toEqual({
      strategy: "watchExerciseTimeElseWorkoutDuration",
      watchSignal: "appleExerciseTime",
      fallbackSignal: "recordedWorkoutDuration",
      combination: "exclusive",
    });
    expect(
      CONDITION_CATALOG.filter(({ signal }) => signal === "activeMinutes").map(
        ({ signalStrategy }) => signalStrategy,
      ),
    ).toEqual([ACTIVE_MINUTES_SIGNAL, ACTIVE_MINUTES_SIGNAL]);
  });
});
