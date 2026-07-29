jest.mock(
  "@react-native-async-storage/async-storage",
  () => require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);

import AsyncStorage from "@react-native-async-storage/async-storage";

import { ALL_DAYS_ACTIVE } from "../model/scheduleRules";
import {
  SCHEDULE_STORAGE_KEY,
  useScheduleStore,
} from "../store/scheduleStore";

describe("schedule store", () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    useScheduleStore.setState(ALL_DAYS_ACTIVE);
  });

  it("persists schedule values without persisting actions", async () => {
    const store = useScheduleStore.getState();
    store.setRecurringRestDay(0, true);
    store.addHoliday({ startDayIndex: 20_654, endDayIndex: 20_658 });
    store.setDayOverride(20_655, "active");
    await Promise.resolve();

    const saved = await AsyncStorage.getItem(SCHEDULE_STORAGE_KEY);
    expect(saved).not.toBeNull();
    expect(saved).not.toContain("setRecurringRestDay");
    expect(saved).not.toContain("addHoliday");
    expect(saved).not.toContain("setDayOverride");

    useScheduleStore.setState(ALL_DAYS_ACTIVE);
    await AsyncStorage.setItem(SCHEDULE_STORAGE_KEY, saved!);
    await useScheduleStore.persist.rehydrate();

    expect(useScheduleStore.getState()).toMatchObject({
      recurringRestWeekdays: [0],
      holidays: [{ startDayIndex: 20_654, endDayIndex: 20_658 }],
      overrides: [{ dayIndex: 20_655, direction: "active" }],
    });
  });
});
