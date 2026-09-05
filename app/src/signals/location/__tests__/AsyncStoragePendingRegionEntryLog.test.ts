jest.mock(
  "@react-native-async-storage/async-storage",
  () => require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);

import AsyncStorage from "@react-native-async-storage/async-storage";

import {
  AsyncStoragePendingRegionEntryLog,
  PENDING_REGION_ENTRY_STORAGE_KEY,
} from "../AsyncStoragePendingRegionEntryLog";

describe("AsyncStoragePendingRegionEntryLog", () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it("persists only coordinate-free enters so a killed app can settle them", async () => {
    const entries = new AsyncStoragePendingRegionEntryLog();

    await entries.record({ regionId: "gym-a", atMs: 1_000 });

    const stored = await AsyncStorage.getItem(PENDING_REGION_ENTRY_STORAGE_KEY);
    expect(stored).toBe('[{"regionId":"gym-a","atMs":1000}]');
    expect(stored).not.toMatch(/lat|lon|radius|coordinate/i);
  });

  it("keeps the first enter per region so a re-delivery cannot restart the dwell", async () => {
    const entries = new AsyncStoragePendingRegionEntryLog();

    await entries.record({ regionId: "gym-a", atMs: 1_000 });
    await entries.record({ regionId: "gym-a", atMs: 4_000 });
    await entries.record({ regionId: "gym-b", atMs: 5_000 });

    await expect(entries.readAll()).resolves.toEqual([
      { regionId: "gym-a", atMs: 1_000 },
      { regionId: "gym-b", atMs: 5_000 },
    ]);
  });

  it("hands an enter to exactly one caller", async () => {
    const entries = new AsyncStoragePendingRegionEntryLog();
    await entries.record({ regionId: "gym-a", atMs: 1_000 });

    await expect(entries.take("gym-a")).resolves.toEqual({
      regionId: "gym-a",
      atMs: 1_000,
    });
    await expect(entries.take("gym-a")).resolves.toBeNull();
    await expect(entries.readAll()).resolves.toEqual([]);
  });

  it("takes only the enters whose dwell has elapsed", async () => {
    const entries = new AsyncStoragePendingRegionEntryLog();
    await entries.record({ regionId: "gym-a", atMs: 1_000 });
    await entries.record({ regionId: "gym-b", atMs: 20_000 });

    await expect(entries.takeElapsed(31_000, 30_000)).resolves.toEqual([
      { regionId: "gym-a", atMs: 1_000 },
    ]);
    await expect(entries.readAll()).resolves.toEqual([
      { regionId: "gym-b", atMs: 20_000 },
    ]);
  });

  it("survives corrupted storage without losing the boundary", async () => {
    await AsyncStorage.setItem(PENDING_REGION_ENTRY_STORAGE_KEY, "not json");
    const entries = new AsyncStoragePendingRegionEntryLog();

    await expect(entries.readAll()).resolves.toEqual([]);
    await entries.record({ regionId: "gym-a", atMs: 1_000 });
    await expect(entries.readAll()).resolves.toEqual([
      { regionId: "gym-a", atMs: 1_000 },
    ]);
  });
});
