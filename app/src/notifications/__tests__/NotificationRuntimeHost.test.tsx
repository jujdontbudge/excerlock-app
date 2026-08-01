jest.mock(
  "@react-native-async-storage/async-storage",
  () => require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);

import AsyncStorage from "@react-native-async-storage/async-storage";
import { render, waitFor } from "@testing-library/react-native";

import { DEFAULT_HOME_STATE, useHomeStore } from "@/home";
import { DEFAULT_CONFESSION, useConfessionStore } from "@/onboarding";
import { ALL_DAYS_ACTIVE, useScheduleStore } from "@/schedule";

import { ManualNotificationClock } from "../clock";
import { NotificationRuntimeHost } from "../runtime/NotificationRuntimeHost";
import { DEFAULT_NOTIFICATION_PREFERENCES } from "../store/notificationPreferencesStore";
import { useNotificationPreferencesStore } from "../store/notificationPreferencesStore";

describe("NotificationRuntimeHost", () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    useHomeStore.setState(DEFAULT_HOME_STATE);
    useScheduleStore.setState(ALL_DAYS_ACTIVE);
    useConfessionStore.setState(DEFAULT_CONFESSION);
    useNotificationPreferencesStore.setState(DEFAULT_NOTIFICATION_PREFERENCES);
  });

  it("reconciles the opened day and pre-schedules the next day", async () => {
    const reconciler = { reconcileDay: jest.fn().mockResolvedValue([]) };
    const clock = new ManualNotificationClock(12 * 60 * 60 * 1_000);

    const view = await render(
      <NotificationRuntimeHost reconciler={reconciler} clock={clock} />,
    );

    await waitFor(() => expect(reconciler.reconcileDay).toHaveBeenCalledTimes(2));
    expect(reconciler.reconcileDay.mock.calls[0]?.[0].day).toMatchObject({
      dayIndex: 0,
      appOpenedToday: true,
    });
    expect(reconciler.reconcileDay.mock.calls[1]?.[0].day).toMatchObject({
      dayIndex: 1,
      appOpenedToday: false,
    });

    await view.unmount();
  });

  it("serializes day reconciliation so delivery evidence cannot race", async () => {
    let finishCurrentDay: (() => void) | undefined;
    const currentDay = new Promise<readonly unknown[]>((resolve) => {
      finishCurrentDay = () => resolve([]);
    });
    const reconciler = {
      reconcileDay: jest
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

    await waitFor(() => expect(reconciler.reconcileDay).toHaveBeenCalledTimes(1));
    finishCurrentDay?.();
    await waitFor(() => expect(reconciler.reconcileDay).toHaveBeenCalledTimes(2));

    await view.unmount();
  });
});
