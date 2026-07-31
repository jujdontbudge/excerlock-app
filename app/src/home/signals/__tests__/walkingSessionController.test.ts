jest.mock(
  "@react-native-async-storage/async-storage",
  () => require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);

import { WalkingSessionController } from "../walkingSessionController";
import type { ConfiguredCondition } from "@excerlock/condition-model";
import type { MotionProvider } from "@/signals";

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
        stopWalkKeepAlive: jest.fn(),
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
  });
});
