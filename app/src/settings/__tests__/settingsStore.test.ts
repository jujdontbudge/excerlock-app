jest.mock(
  "@react-native-async-storage/async-storage",
  () => require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);

import AsyncStorage from "@react-native-async-storage/async-storage";

import {
  DEFAULT_SETTINGS,
  GRACE_PERIOD_OPTIONS_SECONDS,
  SETTINGS_STORAGE_KEY,
  useSettingsStore,
} from "..";

describe("settings store", () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    useSettingsStore.setState(DEFAULT_SETTINGS);
  });

  it("starts with an empty user-set grace period and only the PRD wheel values", () => {
    expect(useSettingsStore.getState().walkAndScrollGracePeriodSeconds).toBeNull();
    expect(GRACE_PERIOD_OPTIONS_SECONDS).toEqual([30, 60, 120, 180, 240, 300]);
  });

  it("restores the user's grace period from AsyncStorage", async () => {
    useSettingsStore.getState().setWalkAndScrollGracePeriod(120);
    await Promise.resolve();
    const savedSettings = await AsyncStorage.getItem(SETTINGS_STORAGE_KEY);

    expect(savedSettings).not.toBeNull();

    useSettingsStore.setState(DEFAULT_SETTINGS);
    await AsyncStorage.setItem(SETTINGS_STORAGE_KEY, savedSettings!);
    await useSettingsStore.persist.rehydrate();

    expect(useSettingsStore.getState().walkAndScrollGracePeriodSeconds).toBe(120);
  });

  it("falls back to the empty default when persisted grace is outside the PRD range", async () => {
    await AsyncStorage.setItem(
      SETTINGS_STORAGE_KEY,
      JSON.stringify({
        state: { walkAndScrollGracePeriodSeconds: 999 },
        version: 0,
      }),
    );

    await useSettingsStore.persist.rehydrate();

    expect(useSettingsStore.getState().walkAndScrollGracePeriodSeconds).toBeNull();
  });

  it("defaults to Monday and persists the user's Sunday week boundary", async () => {
    expect(useSettingsStore.getState().weekStartsOn).toBe(1);

    useSettingsStore.getState().setWeekStartsOn(0);
    await Promise.resolve();
    const savedSettings = await AsyncStorage.getItem(SETTINGS_STORAGE_KEY);
    useSettingsStore.setState(DEFAULT_SETTINGS);
    await AsyncStorage.setItem(SETTINGS_STORAGE_KEY, savedSettings!);
    await useSettingsStore.persist.rehydrate();

    expect(useSettingsStore.getState().weekStartsOn).toBe(0);
  });
});
