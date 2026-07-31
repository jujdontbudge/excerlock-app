jest.mock(
  "@react-native-async-storage/async-storage",
  () => require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);

import { WalkingSessionController } from "../walkingSessionController";
import type { ConfiguredCondition } from "@excerlock/condition-model";
import type {
  ActivitySample,
  CadenceSample,
  MotionProvider,
} from "@/signals";

const walkingCondition: ConfiguredCondition = {
  id: "walking-condition",
  catalogId: "walking-state",
  source: "motion",
  settings: {
    kind: "state",
    reward: { type: "sustainedUnlock" },
    exitGraceMs: 30_000,
  },
};

describe("WalkingSessionController", () => {
  it("starts no native work without an enabled While walking condition", async () => {
    const createMotion = jest.fn();
    const getLocation = jest.fn();
    const controller = new WalkingSessionController({
      createMotion,
      getLocation,
      getState: () => ({ conditions: [], disabledConditionIds: [] }),
      now: () => 0,
    });

    await expect(controller.start("missing-condition")).resolves.toBe(false);
    expect(createMotion).not.toHaveBeenCalled();
    expect(getLocation).not.toHaveBeenCalled();
    expect(controller.getSnapshot()).toEqual({
      active: false,
      conditionId: null,
      walking: false,
    });
  });

  it("starts no native work outside the condition's active window", async () => {
    const createMotion = jest.fn();
    const getLocation = jest.fn();
    const controller = new WalkingSessionController({
      createMotion,
      getLocation,
      getState: () => ({
        conditions: [
          {
            ...walkingCondition,
            activeWindow: { startMinute: 60, endMinute: 120 },
          },
        ],
        disabledConditionIds: [],
      }),
      now: () => 0,
      wallClockNow: () => 3 * 60 * 60_000,
    });

    await expect(controller.start("walking-condition")).resolves.toBe(false);
    expect(createMotion).not.toHaveBeenCalled();
    expect(getLocation).not.toHaveBeenCalled();
  });

  it("starts motion and foreground keep-alive only for an explicit session", async () => {
    const motion = {
      start: jest.fn().mockResolvedValue(undefined),
      stop: jest.fn().mockResolvedValue(undefined),
      on: jest.fn(() => () => {}),
    } as unknown as MotionProvider;
    const startWalkKeepAlive = jest.fn().mockResolvedValue(undefined);
    const controller = new WalkingSessionController({
      createMotion: () => motion,
      getLocation: () => ({
        startWalkKeepAlive,
        stopWalkKeepAlive: jest.fn().mockResolvedValue(undefined),
      }),
      getState: () => ({
        conditions: [walkingCondition],
        disabledConditionIds: [],
      }),
      now: () => 0,
    });

    await expect(controller.start("walking-condition")).resolves.toBe(true);
    expect(startWalkKeepAlive).toHaveBeenCalledTimes(1);
    expect(motion.start).toHaveBeenCalledTimes(1);
    expect(controller.getSnapshot()).toEqual({
      active: true,
      conditionId: "walking-condition",
      walking: false,
    });
    await controller.stop();
  });

  it("publishes verified walking only after classification and sustained cadence", async () => {
    let onActivity: (sample: ActivitySample) => void = () => {};
    let onCadence: (sample: CadenceSample) => void = () => {};
    const motion = {
      start: jest.fn().mockResolvedValue(undefined),
      stop: jest.fn().mockResolvedValue(undefined),
      on: jest.fn((event: "activity" | "cadence", callback: unknown) => {
        if (event === "activity") {
          onActivity = callback as (sample: ActivitySample) => void;
        } else {
          onCadence = callback as (sample: CadenceSample) => void;
        }
        return () => {};
      }),
    } as unknown as MotionProvider;
    const controller = new WalkingSessionController({
      createMotion: () => motion,
      getLocation: () => ({
        startWalkKeepAlive: async () => {},
        stopWalkKeepAlive: async () => {},
      }),
      getState: () => ({
        conditions: [walkingCondition],
        disabledConditionIds: [],
      }),
      now: () => 2_000,
    });
    const listener = jest.fn();
    controller.subscribe(listener);
    await controller.start("walking-condition");

    onActivity({
      classes: ["walking"],
      confidence: "high",
      startedAt: 0,
      receivedAt: 0,
    });
    expect(controller.getSnapshot().walking).toBe(false);

    onCadence({ stepsPerSecond: 1.2, cumulativeSteps: 2, asOf: 1_000 });
    onCadence({ stepsPerSecond: 1.2, cumulativeSteps: 4, asOf: 2_000 });

    expect(controller.getSnapshot().walking).toBe(true);
    expect(listener).toHaveBeenCalledWith();
    await controller.stop();
  });

  it("ends the session and native work when stop grace expires", async () => {
    jest.useFakeTimers();
    let now = 0;
    let onActivity: (sample: ActivitySample) => void = () => {};
    let onCadence: (sample: CadenceSample) => void = () => {};
    const stopMotion = jest.fn().mockResolvedValue(undefined);
    const stopWalkKeepAlive = jest.fn().mockResolvedValue(undefined);
    const motion = {
      start: jest.fn().mockResolvedValue(undefined),
      stop: stopMotion,
      on: jest.fn((event: "activity" | "cadence", callback: unknown) => {
        if (event === "activity") {
          onActivity = callback as (sample: ActivitySample) => void;
        } else {
          onCadence = callback as (sample: CadenceSample) => void;
        }
        return () => {};
      }),
    } as unknown as MotionProvider;
    const controller = new WalkingSessionController({
      createMotion: () => motion,
      getLocation: () => ({
        startWalkKeepAlive: async () => {},
        stopWalkKeepAlive,
      }),
      getState: () => ({
        conditions: [walkingCondition],
        disabledConditionIds: [],
      }),
      now: () => now,
    });
    await controller.start("walking-condition");
    onActivity({
      classes: ["walking"],
      confidence: "high",
      startedAt: 0,
      receivedAt: 0,
    });
    onCadence({ stepsPerSecond: 1.2, cumulativeSteps: 2, asOf: 1_000 });
    onCadence({ stepsPerSecond: 1.2, cumulativeSteps: 4, asOf: 2_000 });

    now = 3_000;
    onActivity({
      classes: ["stationary"],
      confidence: "high",
      startedAt: now,
      receivedAt: now,
    });
    expect(controller.getSnapshot().walking).toBe(true);

    now = 33_000;
    await jest.advanceTimersByTimeAsync(30_000);

    expect(controller.getSnapshot()).toEqual({
      active: false,
      conditionId: null,
      walking: false,
    });
    expect(stopMotion).toHaveBeenCalledTimes(1);
    expect(stopWalkKeepAlive).toHaveBeenCalledTimes(1);
    jest.useRealTimers();
  });
});
