jest.mock(
  "@react-native-async-storage/async-storage",
  () => require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);

import { WalkingSessionController } from "../walkingSessionController";

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
});
