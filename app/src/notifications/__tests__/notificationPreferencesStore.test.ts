jest.mock(
  "@react-native-async-storage/async-storage",
  () => require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);

import AsyncStorage from "@react-native-async-storage/async-storage";

import { NOTIFICATION_TYPE_IDS } from "../model/catalog";
import {
  AFTERNOON_NUDGE_MINUTE_OPTIONS,
  DEFAULT_NOTIFICATION_PREFERENCES,
  NOTIFICATION_PREFERENCES_STORAGE_KEY,
  isNotificationEnabled,
  useNotificationPreferencesStore,
} from "../store/notificationPreferencesStore";

function reset() {
  useNotificationPreferencesStore.setState({
    ...DEFAULT_NOTIFICATION_PREFERENCES,
  });
}

describe("notification preferences", () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    reset();
  });

  it("ships the app silent — every type defaults OFF", () => {
    const state = useNotificationPreferencesStore.getState();
    for (const id of NOTIFICATION_TYPE_IDS) {
      expect(state.enabled[id]).toBe(false);
      expect(isNotificationEnabled(state, id)).toBe(false);
    }
  });

  it("leaves the nudge time unset, like every other user-set picker", () => {
    expect(
      useNotificationPreferencesStore.getState().afternoonNudgeMinuteOfDay,
    ).toBeNull();
    expect(AFTERNOON_NUDGE_MINUTE_OPTIONS.every((minute) => minute >= 12 * 60)).toBe(
      true,
    );
  });

  it("silences one type without touching the others", () => {
    const { setNotificationEnabled } = useNotificationPreferencesStore.getState();
    for (const id of NOTIFICATION_TYPE_IDS) setNotificationEnabled(id, true);

    setNotificationEnabled("weeklyRecap", false);

    const state = useNotificationPreferencesStore.getState();
    expect(state.enabled.weeklyRecap).toBe(false);
    expect(state.enabled.afternoonNudge).toBe(true);
    expect(state.enabled.streakLastCall).toBe(true);
  });

  it("turns one type on without turning on the rest", () => {
    useNotificationPreferencesStore
      .getState()
      .setNotificationEnabled("streakLastCall", true);

    const state = useNotificationPreferencesStore.getState();
    expect(state.enabled.streakLastCall).toBe(true);
    expect(state.enabled.afternoonNudge).toBe(false);
    expect(state.enabled.weeklyRecap).toBe(false);
  });

  it("restores the user's toggles and nudge time from AsyncStorage", async () => {
    const store = useNotificationPreferencesStore.getState();
    store.setNotificationEnabled("afternoonNudge", true);
    store.setAfternoonNudgeMinute(AFTERNOON_NUDGE_MINUTE_OPTIONS[2]);
    await Promise.resolve();

    const saved = await AsyncStorage.getItem(NOTIFICATION_PREFERENCES_STORAGE_KEY);
    expect(saved).not.toBeNull();

    reset();
    await AsyncStorage.setItem(NOTIFICATION_PREFERENCES_STORAGE_KEY, saved!);
    await useNotificationPreferencesStore.persist.rehydrate();

    const restored = useNotificationPreferencesStore.getState();
    expect(restored.enabled.afternoonNudge).toBe(true);
    expect(restored.enabled.weeklyRecap).toBe(false);
    expect(restored.afternoonNudgeMinuteOfDay).toBe(
      AFTERNOON_NUDGE_MINUTE_OPTIONS[2],
    );
  });

  it("falls back to silent when storage holds something that is not a toggle map", async () => {
    await AsyncStorage.setItem(
      NOTIFICATION_PREFERENCES_STORAGE_KEY,
      JSON.stringify({ state: { enabled: "yes please" }, version: 0 }),
    );

    await useNotificationPreferencesStore.persist.rehydrate();

    const state = useNotificationPreferencesStore.getState();
    for (const id of NOTIFICATION_TYPE_IDS) expect(state.enabled[id]).toBe(false);
  });

  it("ignores a persisted type that no longer exists and a non-boolean value", async () => {
    await AsyncStorage.setItem(
      NOTIFICATION_PREFERENCES_STORAGE_KEY,
      JSON.stringify({
        state: {
          enabled: { earnVerified: true, weeklyRecap: "true", streakLastCall: true },
          afternoonNudgeMinuteOfDay: 3 * 60,
        },
        version: 0,
      }),
    );

    await useNotificationPreferencesStore.persist.rehydrate();

    const state = useNotificationPreferencesStore.getState();
    expect(Object.keys(state.enabled).sort()).toEqual(
      [...NOTIFICATION_TYPE_IDS].sort(),
    );
    expect(state.enabled.weeklyRecap).toBe(false);
    expect(state.enabled.streakLastCall).toBe(true);
    expect(state.afternoonNudgeMinuteOfDay).toBeNull();
  });
});
