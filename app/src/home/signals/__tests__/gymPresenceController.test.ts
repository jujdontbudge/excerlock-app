jest.mock(
  "@react-native-async-storage/async-storage",
  () => require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);

import type { ConfiguredCondition } from "@excerlock/condition-model";

import { GymPresenceController } from "../gymPresenceController";

const gymArrival: ConfiguredCondition = {
  id: "gym-arrival-condition",
  catalogId: "gym-arrival",
  source: "location",
  placeId: "gym-one",
  settings: {
    kind: "event",
    reward: { type: "fixedMinutes", minutes: 30 },
    repeatable: false,
    perDayCap: null,
    cooldownMs: 0,
  },
};

describe("GymPresenceController manual check-in", () => {
  it("samples the saved gym and pays only after location confirms presence", async () => {
    const checkIn = jest.fn().mockResolvedValue(true);
    const recordEventPayout = jest.fn();
    const controller = new GymPresenceController({
      getState: () => ({
        conditions: [gymArrival],
        disabledConditionIds: [],
        savedPlaces: [
          {
            id: "gym-one",
            name: "Neighborhood gym",
            geofence: {
              latitude: 40.7128,
              longitude: -74.006,
              radiusMeters: 100,
            },
          },
        ],
      }),
      getLocation: () => ({ checkIn }),
      now: () => 123_000,
      recordEventPayout,
    });

    await expect(controller.checkIn("gym-arrival-condition")).resolves.toBe(true);
    expect(checkIn).toHaveBeenCalledWith({
      id: "gym-one",
      latitude: 40.7128,
      longitude: -74.006,
      radiusMeters: 100,
    });
    expect(recordEventPayout).toHaveBeenCalledWith(
      "gym-arrival-condition",
      123_000,
    );
  });
});
