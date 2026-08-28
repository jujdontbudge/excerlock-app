jest.mock(
  "@react-native-async-storage/async-storage",
  () => require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);

import { WalkingSessionController } from "../walkingSessionController";
import type { ConfiguredCondition } from "@excerlock/condition-model";
import type {
  ActivitySample,
  CadenceSample,
  DeviceMotionSample,
  MotionProvider,
  PhonePlacementProvider,
} from "@/signals";
import type { WalkLeaseWarningNotifier } from "@/notifications";

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

function createProppedHarness(now: () => number = () => 0) {
  let onActivity: (sample: ActivitySample) => void = () => {};
  let onCadence: (sample: CadenceSample) => void = () => {};
  let onPlacement: (sample: DeviceMotionSample) => void = () => {};
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
  const placement = {
    start: jest.fn().mockResolvedValue(undefined),
    stop: jest.fn().mockResolvedValue(undefined),
    onSample: jest.fn((callback: (sample: DeviceMotionSample) => void) => {
      onPlacement = callback;
      return () => {};
    }),
  } as PhonePlacementProvider;
  const stopWalkKeepAlive = jest.fn().mockResolvedValue(undefined);
  const leaseWarning: WalkLeaseWarningNotifier = {
    schedule: jest.fn().mockResolvedValue(undefined),
    cancel: jest.fn().mockResolvedValue(undefined),
  };
  const controller = new WalkingSessionController({
    createMotion: () => motion,
    createPlacement: () => placement,
    getLocation: () => ({
      startWalkKeepAlive: async () => {},
      stopWalkKeepAlive,
    }),
    getState: () => ({
      conditions: [walkingCondition],
      disabledConditionIds: [],
    }),
    now,
    wallClockNow: now,
    leaseWarning,
  });

  return {
    controller,
    emitActivity: (sample: ActivitySample) => onActivity(sample),
    emitCadence: (sample: CadenceSample) => onCadence(sample),
    emitPlacement: (sample: DeviceMotionSample) => onPlacement(sample),
    motion,
    placement,
    leaseWarning,
    stopWalkKeepAlive,
  };
}

function emitProppedThenPickup(
  emitPlacement: (sample: DeviceMotionSample) => void,
): void {
  for (let timestampMs = 0; timestampMs <= 1_000; timestampMs += 100) {
    emitPlacement({
      timestampMs,
      gravity: { x: 0, y: -1, z: 0 },
      rotationRate: { x: 0, y: 0, z: 0 },
    });
  }
  for (let timestampMs = 1_100; timestampMs <= 3_300; timestampMs += 100) {
    emitPlacement({
      timestampMs,
      gravity: { x: (timestampMs - 1_000) / 5_000, y: -1, z: 0 },
      rotationRate: { x: 0.18, y: 0.14, z: 0.1 },
    });
  }
}

function emitSetDown(
  emitPlacement: (sample: DeviceMotionSample) => void,
): void {
  for (let timestampMs = 3_400; timestampMs <= 5_000; timestampMs += 100) {
    emitPlacement({
      timestampMs,
      gravity: { x: 0, y: -1, z: 0 },
      rotationRate: { x: 0, y: 0, z: 0 },
    });
  }
}

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

  it("ends a running session at the condition's active-window boundary", async () => {
    jest.useFakeTimers();
    let wallClockNow = 90 * 60_000;
    const stopMotion = jest.fn().mockResolvedValue(undefined);
    const stopWalkKeepAlive = jest.fn().mockResolvedValue(undefined);
    const motion = {
      start: jest.fn().mockResolvedValue(undefined),
      stop: stopMotion,
      on: jest.fn(() => () => {}),
    } as unknown as MotionProvider;
    const controller = new WalkingSessionController({
      createMotion: () => motion,
      getLocation: () => ({
        startWalkKeepAlive: async () => {},
        stopWalkKeepAlive,
      }),
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
      wallClockNow: () => wallClockNow,
    });

    await controller.start("walking-condition");
    wallClockNow = 120 * 60_000;
    await jest.advanceTimersByTimeAsync(30 * 60_000);

    expect(controller.getSnapshot().active).toBe(false);
    expect(stopMotion).toHaveBeenCalledTimes(1);
    expect(stopWalkKeepAlive).toHaveBeenCalledTimes(1);
    jest.useRealTimers();
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

  it("stops native work when the active condition is removed", async () => {
    let state = {
      conditions: [walkingCondition],
      disabledConditionIds: [] as string[],
    };
    const stopMotion = jest.fn().mockResolvedValue(undefined);
    const stopWalkKeepAlive = jest.fn().mockResolvedValue(undefined);
    const motion = {
      start: jest.fn().mockResolvedValue(undefined),
      stop: stopMotion,
      on: jest.fn(() => () => {}),
    } as unknown as MotionProvider;
    const controller = new WalkingSessionController({
      createMotion: () => motion,
      getLocation: () => ({
        startWalkKeepAlive: async () => {},
        stopWalkKeepAlive,
      }),
      getState: () => state,
      now: () => 0,
    });
    await controller.start("walking-condition");

    state = { conditions: [], disabledConditionIds: [] };
    await controller.reconcileCondition();

    expect(controller.getSnapshot().active).toBe(false);
    expect(stopMotion).toHaveBeenCalledTimes(1);
    expect(stopWalkKeepAlive).toHaveBeenCalledTimes(1);
  });

  it("publishes verified walking only after classification and sustained cadence", async () => {
    let now = 2_000;
    let onActivity: (sample: ActivitySample) => void = () => {};
    let onCadence: (sample: CadenceSample) => void = () => {};
    const leaseWarning: WalkLeaseWarningNotifier = {
      schedule: jest.fn().mockResolvedValue(undefined),
      cancel: jest.fn().mockResolvedValue(undefined),
    };
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
      now: () => now,
      wallClockNow: () => now,
      leaseWarning,
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
    expect(leaseWarning.schedule).toHaveBeenLastCalledWith(902_000);

    listener.mockClear();
    now = 5 * 60_000;
    onCadence({ stepsPerSecond: 1.2, cumulativeSteps: 6, asOf: now });

    expect(controller.getSnapshot().walking).toBe(true);
    expect(listener).toHaveBeenCalledTimes(1);
    expect(leaseWarning.schedule).toHaveBeenLastCalledWith(20 * 60_000);
    await controller.stop();
  });

  it("never lapses the lease on a continuously verified handheld walker", async () => {
    // The 15-minute lease exists for propped sessions, which produce no live
    // signal. Ordinary Walk & Scroll flows through the same controller, so it
    // must not inherit a deadline: a walker who keeps verifying should have the
    // window rolled forward invisibly and never meet a shield.
    jest.useFakeTimers();
    let now = 0;
    let onActivity: (sample: ActivitySample) => void = () => {};
    let onCadence: (sample: CadenceSample) => void = () => {};
    const stopMotion = jest.fn().mockResolvedValue(undefined);
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
        stopWalkKeepAlive: async () => {},
      }),
      getState: () => ({
        conditions: [walkingCondition],
        disabledConditionIds: [],
      }),
      now: () => now,
      wallClockNow: () => now,
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
    expect(controller.getSnapshot().walking).toBe(true);

    // Walk for 30 minutes — twice the lease — reporting cadence inside the
    // 5-second freshness window, which is how CMPedometer actually delivers it.
    const cadenceIntervalMs = 2_000;
    let steps = 4;
    for (
      let elapsedMs = cadenceIntervalMs;
      elapsedMs <= 30 * 60_000;
      elapsedMs += cadenceIntervalMs
    ) {
      now = elapsedMs;
      await jest.advanceTimersByTimeAsync(cadenceIntervalMs);
      steps += 4;
      onCadence({ stepsPerSecond: 1.2, cumulativeSteps: steps, asOf: now });
      expect(controller.getSnapshot().walking).toBe(true);
    }

    expect(controller.getSnapshot().active).toBe(true);
    expect(stopMotion).not.toHaveBeenCalled();
    await controller.stop();
    jest.useRealTimers();
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

  it("starts explicit propped mode in scanning while retaining motion keep-alive", async () => {
    const motion = {
      start: jest.fn().mockResolvedValue(undefined),
      stop: jest.fn().mockResolvedValue(undefined),
      on: jest.fn(() => () => {}),
    } as unknown as MotionProvider;
    const placement = {
      start: jest.fn().mockResolvedValue(undefined),
      stop: jest.fn().mockResolvedValue(undefined),
      onSample: jest.fn(() => () => {}),
    } as PhonePlacementProvider;
    const startWalkKeepAlive = jest.fn().mockResolvedValue(undefined);
    const controller = new WalkingSessionController({
      createMotion: () => motion,
      createPlacement: () => placement,
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

    await expect(
      controller.start("walking-condition", "propped"),
    ).resolves.toBe(true);

    expect(controller.getTreadmillSnapshot()).toEqual({
      mode: "propped",
      phase: "scanning",
    });
    expect(startWalkKeepAlive).toHaveBeenCalledTimes(1);
    expect(motion.start).toHaveBeenCalledTimes(1);
    expect(placement.start).toHaveBeenCalledTimes(1);
    await controller.stop();
  });

  it("moves a successful foreground gait scan into verified propped access", async () => {
    const motion = {
      start: jest.fn().mockResolvedValue(undefined),
      stop: jest.fn().mockResolvedValue(undefined),
      on: jest.fn(() => () => {}),
    } as unknown as MotionProvider;
    const placement = {
      start: jest.fn().mockResolvedValue(undefined),
      stop: jest.fn().mockResolvedValue(undefined),
      onSample: jest.fn(() => () => {}),
    } as PhonePlacementProvider;
    const controller = new WalkingSessionController({
      createMotion: () => motion,
      createPlacement: () => placement,
      getLocation: () => ({
        startWalkKeepAlive: async () => {},
        stopWalkKeepAlive: async () => {},
      }),
      getState: () => ({
        conditions: [walkingCondition],
        disabledConditionIds: [],
      }),
      now: () => 0,
    });
    await controller.start("walking-condition", "propped");

    expect(controller.completeProppedScan()).toBe(true);

    expect(controller.getTreadmillSnapshot()).toEqual({
      mode: "propped",
      phase: "propped",
    });
    expect(controller.getSnapshot().walking).toBe(true);
    await controller.stop();
  });

  it("re-shields a propped session when its 15-minute lease lapses", async () => {
    jest.useFakeTimers();
    let now = 0;
    const { controller } = createProppedHarness(() => now);
    await controller.start("walking-condition", "propped");
    controller.completeProppedScan();

    now = 15 * 60_000 - 1;
    await jest.advanceTimersByTimeAsync(now);
    expect(controller.getSnapshot().walking).toBe(true);

    now = 15 * 60_000;
    await jest.advanceTimersByTimeAsync(1);
    expect(controller.getSnapshot()).toMatchObject({
      active: true,
      walking: false,
    });
    expect(controller.getTreadmillSnapshot()).toEqual({
      mode: "propped",
      phase: "scanning",
    });

    await controller.stop();
    jest.useRealTimers();
  });

  it("starts a fresh lease only after the required post-expiry scan", async () => {
    jest.useFakeTimers();
    let now = 0;
    const { controller, leaseWarning } = createProppedHarness(() => now);
    await controller.start("walking-condition", "propped");
    controller.completeProppedScan();

    now = 15 * 60_000;
    await jest.advanceTimersByTimeAsync(now);
    expect(controller.getSnapshot().walking).toBe(false);

    expect(controller.completeProppedScan()).toBe(true);
    expect(controller.getSnapshot().walking).toBe(true);
    expect(leaseWarning.schedule).toHaveBeenLastCalledWith(30 * 60_000);

    await controller.stop();
    jest.useRealTimers();
  });

  it("fails closed after background suspension even when the lease timer did not run", async () => {
    let now = 0;
    const { controller } = createProppedHarness(() => now);
    await controller.start("walking-condition", "propped");
    controller.completeProppedScan();

    now = 15 * 60_000;

    expect(controller.getSnapshot()).toMatchObject({
      active: true,
      walking: false,
    });
    expect(controller.getTreadmillSnapshot()).toEqual({
      mode: "propped",
      phase: "scanning",
    });
    await controller.stop();
  });

  it("schedules and cancels the operational pre-expiry warning with the lease", async () => {
    const { controller, leaseWarning } = createProppedHarness();
    await controller.start("walking-condition", "propped");

    controller.completeProppedScan();

    expect(leaseWarning.schedule).toHaveBeenCalledWith(15 * 60_000);
    await controller.stop();
    expect(leaseWarning.cancel).toHaveBeenCalledTimes(1);
  });

  it("extends the propped lease when handheld motion verifies", async () => {
    let now = 0;
    const {
      controller,
      emitActivity,
      emitCadence,
      emitPlacement,
      leaseWarning,
    } = createProppedHarness(() => now);
    await controller.start("walking-condition", "propped");
    controller.completeProppedScan();
    emitProppedThenPickup(emitPlacement);

    now = 5 * 60_000;
    emitActivity({
      classes: ["walking"],
      confidence: "high",
      startedAt: now,
      receivedAt: now,
    });
    emitCadence({ stepsPerSecond: 1.2, cumulativeSteps: 2, asOf: now });
    emitCadence({
      stepsPerSecond: 1.2,
      cumulativeSteps: 4,
      asOf: now + 1_000,
    });

    expect(leaseWarning.schedule).toHaveBeenLastCalledWith(20 * 60_000);
    await controller.stop();
  });

  it("moves from propped to handheld when placement reports a pickup", async () => {
    let onPlacementSample: (sample: DeviceMotionSample) => void = () => {};
    const motion = {
      start: jest.fn().mockResolvedValue(undefined),
      stop: jest.fn().mockResolvedValue(undefined),
      on: jest.fn(() => () => {}),
    } as unknown as MotionProvider;
    const placement = {
      start: jest.fn().mockResolvedValue(undefined),
      stop: jest.fn().mockResolvedValue(undefined),
      onSample: jest.fn((callback: (sample: DeviceMotionSample) => void) => {
        onPlacementSample = callback;
        return () => {};
      }),
    } as PhonePlacementProvider;
    const controller = new WalkingSessionController({
      createMotion: () => motion,
      createPlacement: () => placement,
      getLocation: () => ({
        startWalkKeepAlive: async () => {},
        stopWalkKeepAlive: async () => {},
      }),
      getState: () => ({
        conditions: [walkingCondition],
        disabledConditionIds: [],
      }),
      now: () => 0,
    });
    await controller.start("walking-condition", "propped");
    controller.completeProppedScan();
    emitProppedThenPickup(onPlacementSample);

    expect(controller.getTreadmillSnapshot()).toEqual({
      mode: "propped",
      phase: "handheld",
    });
    expect(controller.getSnapshot().walking).toBe(true);
    await controller.stop();
  });

  it("keeps access for 20 seconds after pickup, then applies exit grace", async () => {
    jest.useFakeTimers();
    let now = 0;
    const { controller, emitPlacement } = createProppedHarness(() => now);
    await controller.start("walking-condition", "propped");
    controller.completeProppedScan();
    emitProppedThenPickup(emitPlacement);

    now = 19_999;
    await jest.advanceTimersByTimeAsync(19_999);
    expect(controller.getSnapshot()).toMatchObject({ active: true, walking: true });

    now = 20_000;
    await jest.advanceTimersByTimeAsync(1);
    expect(controller.getSnapshot()).toMatchObject({ active: true, walking: true });

    now = 49_999;
    await jest.advanceTimersByTimeAsync(29_999);
    expect(controller.getSnapshot()).toMatchObject({ active: true, walking: true });

    now = 50_000;
    await jest.advanceTimersByTimeAsync(1);
    expect(controller.getSnapshot()).toEqual({
      active: false,
      conditionId: null,
      walking: false,
    });
    jest.useRealTimers();
  });

  it("cancels the pickup countdown when handheld cadence verifies", async () => {
    jest.useFakeTimers();
    let now = 0;
    const { controller, emitActivity, emitCadence, emitPlacement } =
      createProppedHarness(() => now);
    await controller.start("walking-condition", "propped");
    controller.completeProppedScan();
    emitProppedThenPickup(emitPlacement);

    emitActivity({
      classes: ["walking"],
      confidence: "high",
      startedAt: 3_000,
      receivedAt: 3_000,
    });
    emitCadence({ stepsPerSecond: 1.2, cumulativeSteps: 2, asOf: 4_000 });
    emitCadence({ stepsPerSecond: 1.2, cumulativeSteps: 4, asOf: 5_000 });

    let cumulativeSteps = 6;
    let elapsed = 0;
    for (let timestampMs = 9_000; timestampMs <= 49_000; timestampMs += 4_000) {
      await jest.advanceTimersByTimeAsync(timestampMs - elapsed);
      elapsed = timestampMs;
      now = timestampMs;
      emitCadence({ stepsPerSecond: 1.2, cumulativeSteps, asOf: timestampMs });
      cumulativeSteps += 2;
    }
    now = 51_000;
    await jest.advanceTimersByTimeAsync(2_000);
    expect(controller.getSnapshot()).toMatchObject({ active: true, walking: true });
    expect(controller.getTreadmillSnapshot().phase).toBe("handheld");
    await controller.stop();
    jest.useRealTimers();
  });

  it("pauses exit grace during the 60-second set-down handoff", async () => {
    jest.useFakeTimers();
    let now = 0;
    const { controller, emitPlacement } = createProppedHarness(() => now);
    await controller.start("walking-condition", "propped");
    controller.completeProppedScan();
    emitProppedThenPickup(emitPlacement);
    emitSetDown(emitPlacement);

    expect(controller.getTreadmillSnapshot().phase).toBe("handoff");

    now = 59_999;
    await jest.advanceTimersByTimeAsync(59_999);
    expect(controller.getSnapshot()).toMatchObject({ active: true, walking: true });
    expect(controller.getTreadmillSnapshot().phase).toBe("handoff");

    now = 60_000;
    await jest.advanceTimersByTimeAsync(1);
    expect(controller.getSnapshot()).toMatchObject({ active: true, walking: false });
    expect(controller.getTreadmillSnapshot().phase).toBe("scanning");
    expect(controller.completeProppedScan()).toBe(true);
    expect(controller.getSnapshot()).toMatchObject({ active: true, walking: true });
    expect(controller.getTreadmillSnapshot().phase).toBe("propped");
    await controller.stop();
    jest.useRealTimers();
  });

  it("publishes walking and treadmill idle together when a session stops", async () => {
    const { controller } = createProppedHarness();
    const publications: Array<{
      walking: ReturnType<typeof controller.getSnapshot>;
      treadmill: ReturnType<typeof controller.getTreadmillSnapshot>;
    }> = [];
    controller.subscribe(() => {
      publications.push({
        walking: controller.getSnapshot(),
        treadmill: controller.getTreadmillSnapshot(),
      });
    });
    await controller.start("walking-condition", "propped");
    controller.completeProppedScan();

    await controller.stop();

    expect(publications.at(-1)).toEqual({
      walking: { active: false, conditionId: null, walking: false },
      treadmill: { mode: null, phase: null },
    });
  });
});
