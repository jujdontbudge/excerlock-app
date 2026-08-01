jest.mock(
  "@react-native-async-storage/async-storage",
  () => require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);

import AsyncStorage from "@react-native-async-storage/async-storage";
import { act, render, waitFor } from "@testing-library/react-native";

import { DEFAULT_HOME_STATE, useHomeStore } from "@/home";
import { DEFAULT_CONFESSION, useConfessionStore } from "@/onboarding";
import { ALL_DAYS_ACTIVE, useScheduleStore } from "@/schedule";
import { DEFAULT_SETTINGS, useSettingsStore } from "@/settings";

import { ManualNotificationClock } from "../clock";
import type { NotificationPlanningInput } from "../NotificationScheduler";
import { NotificationRuntimeHost } from "../runtime/NotificationRuntimeHost";
import { DEFAULT_NOTIFICATION_PREFERENCES } from "../store/notificationPreferencesStore";
import { useNotificationPreferencesStore } from "../store/notificationPreferencesStore";

describe("NotificationRuntimeHost", () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    useHomeStore.setState(DEFAULT_HOME_STATE);
    useScheduleStore.setState(ALL_DAYS_ACTIVE);
    useConfessionStore.setState(DEFAULT_CONFESSION);
    useSettingsStore.setState(DEFAULT_SETTINGS);
    useNotificationPreferencesStore.setState(DEFAULT_NOTIFICATION_PREFERENCES);
  });

  it("reconciles the opened day and pre-schedules the next day", async () => {
    const reconciler = { reconcileDays: jest.fn().mockResolvedValue([]) };
    const clock = new ManualNotificationClock(12 * 60 * 60 * 1_000);

    const view = await render(
      <NotificationRuntimeHost reconciler={reconciler} clock={clock} />,
    );

    await waitFor(() => expect(reconciler.reconcileDays).toHaveBeenCalledTimes(1));
    const horizon = reconciler.reconcileDays.mock.calls[0]?.[0] as
      | readonly NotificationPlanningInput[]
      | undefined;
    expect(horizon).toHaveLength(8);
    expect(horizon?.[0].day).toMatchObject({
      dayIndex: 0,
      appOpenedToday: true,
    });
    expect(horizon?.[1].day).toMatchObject({
      dayIndex: 1,
      appOpenedToday: false,
    });

    await view.unmount();
  });

  it("plans weekly recaps against the user's chosen week boundary", async () => {
    useSettingsStore.setState({ weekStartsOn: 0 });
    const reconciler = { reconcileDays: jest.fn().mockResolvedValue([]) };

    const view = await render(
      <NotificationRuntimeHost
        reconciler={reconciler}
        clock={new ManualNotificationClock(12 * 60 * 60 * 1_000)}
      />,
    );

    await waitFor(() => expect(reconciler.reconcileDays).toHaveBeenCalledTimes(1));
    const horizon = reconciler.reconcileDays.mock.calls[0]?.[0] as
      | readonly NotificationPlanningInput[]
      | undefined;
    expect(horizon?.every((input) => input.week.weekStartsOn === 0)).toBe(true);

    await view.unmount();
  });

  it("serializes day reconciliation so delivery evidence cannot race", async () => {
    let finishCurrentDay: (() => void) | undefined;
    const currentDay = new Promise<readonly unknown[]>((resolve) => {
      finishCurrentDay = () => resolve([]);
    });
    const reconciler = {
      reconcileDays: jest
        .fn()
        .mockReturnValueOnce(currentDay)
        .mockResolvedValueOnce([]),
    };

    const view = await render(
      <NotificationRuntimeHost
        reconciler={reconciler}
        clock={new ManualNotificationClock(12 * 60 * 60 * 1_000)}
      />,
    );

    await waitFor(() => expect(reconciler.reconcileDays).toHaveBeenCalledTimes(1));
    await act(() => {
      useNotificationPreferencesStore.setState({
        afternoonNudgeMinuteOfDay: 16 * 60,
      });
    });
    expect(reconciler.reconcileDays).toHaveBeenCalledTimes(1);
    finishCurrentDay?.();
    await waitFor(() => expect(reconciler.reconcileDays).toHaveBeenCalledTimes(2));

    await view.unmount();
  });
});
