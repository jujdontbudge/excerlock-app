jest.mock(
  "@react-native-async-storage/async-storage",
  () => require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);

import AsyncStorage from "@react-native-async-storage/async-storage";

import {
  AsyncStorageGymVisitLog,
  GYM_VISIT_LOG_STORAGE_KEY,
} from "../AsyncStorageGymVisitLog";

describe("AsyncStorageGymVisitLog", () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it("persists only coordinate-free confirmed visit fields on device", async () => {
    const log = new AsyncStorageGymVisitLog();

    await log.open("gym-a", 1_000);

    await expect(log.readAll()).resolves.toEqual([
      { regionId: "gym-a", enteredAt: 1_000, exitedAt: null },
    ]);
    const stored = await AsyncStorage.getItem(GYM_VISIT_LOG_STORAGE_KEY);
    expect(stored).toBe(
      '[{"regionId":"gym-a","enteredAt":1000,"exitedAt":null}]',
    );
    expect(stored).not.toMatch(/lat|lon|radius|coordinate/i);
  });

  it("closes the interval the arrival opened so a stay has a duration", async () => {
    const log = new AsyncStorageGymVisitLog();

    await log.open("gym-a", 1_000);
    await log.close("gym-a", 4_600_000);

    await expect(log.readAll()).resolves.toEqual([
      { regionId: "gym-a", enteredAt: 1_000, exitedAt: 4_600_000 },
    ]);
  });

  it("keeps one open interval per region however often the geofence fires", async () => {
    const log = new AsyncStorageGymVisitLog();

    await log.open("gym-a", 1_000);
    await log.open("gym-a", 2_000);
    await log.open("gym-b", 3_000);

    await expect(log.readAll()).resolves.toEqual([
      { regionId: "gym-a", enteredAt: 1_000, exitedAt: null },
      { regionId: "gym-b", enteredAt: 3_000, exitedAt: null },
    ]);
  });

  it("ignores a close with no open interval and never reopens a closed one", async () => {
    const log = new AsyncStorageGymVisitLog();

    await log.close("gym-a", 1_000);
    await expect(log.readAll()).resolves.toEqual([]);

    await log.open("gym-a", 2_000);
    await log.close("gym-a", 3_000);
    await log.close("gym-a", 9_000);

    await expect(log.readAll()).resolves.toEqual([
      { regionId: "gym-a", enteredAt: 2_000, exitedAt: 3_000 },
    ]);
  });

  it("never books a negative stay when the clock moved backwards", async () => {
    const log = new AsyncStorageGymVisitLog();

    await log.open("gym-a", 5_000);
    await log.close("gym-a", 1_000);

    await expect(log.readAll()).resolves.toEqual([
      { regionId: "gym-a", enteredAt: 5_000, exitedAt: 5_000 },
    ]);
  });
});
