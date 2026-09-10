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

    await log.append({ regionId: "gym-a", atMs: 1_000 });

    await expect(log.readAll()).resolves.toEqual([
      { regionId: "gym-a", atMs: 1_000 },
    ]);
    const stored = await AsyncStorage.getItem(GYM_VISIT_LOG_STORAGE_KEY);
    expect(stored).toBe('[{"regionId":"gym-a","atMs":1000}]');
    expect(stored).not.toMatch(/lat|lon|radius|coordinate/i);
  });
});
