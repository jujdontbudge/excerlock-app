jest.mock(
  "@react-native-async-storage/async-storage",
  () => require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);

import AsyncStorage from "@react-native-async-storage/async-storage";

import {
  CONFESSION_STORAGE_KEY,
  DEFAULT_CONFESSION,
  useConfessionStore,
} from "..";

describe("confession store", () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    useConfessionStore.setState(DEFAULT_CONFESSION);
  });

  it("persists confessed daily minutes for the later Time Reclaimed analysis", async () => {
    useConfessionStore.getState().setConfessedDailyMinutes(300);
    await Promise.resolve();

    const savedConfession = await AsyncStorage.getItem(CONFESSION_STORAGE_KEY);
    expect(savedConfession).not.toBeNull();

    useConfessionStore.setState(DEFAULT_CONFESSION);
    await AsyncStorage.setItem(CONFESSION_STORAGE_KEY, savedConfession!);
    await useConfessionStore.persist.rehydrate();

    expect(useConfessionStore.getState().confessedDailyMinutes).toBe(300);
  });

  it("rejects persisted values outside the 1–12 hour confession range", async () => {
    await AsyncStorage.setItem(
      CONFESSION_STORAGE_KEY,
      JSON.stringify({
        state: { confessedDailyMinutes: 721 },
        version: 0,
      }),
    );

    await useConfessionStore.persist.rehydrate();

    expect(useConfessionStore.getState().confessedDailyMinutes).toBeNull();
  });
});
