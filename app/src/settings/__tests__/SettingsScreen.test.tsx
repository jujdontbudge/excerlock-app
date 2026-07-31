jest.mock(
  "@react-native-async-storage/async-storage",
  () => require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);

import AsyncStorage from "@react-native-async-storage/async-storage";
import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";

import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  type NotificationModule,
  useNotificationPreferencesStore,
} from "@/notifications";

import { DEFAULT_SETTINGS, SettingsScreen, useSettingsStore } from "..";

function approvedNotificationModule(): NotificationModule {
  return {
    getAuthorizationStatus: async () => "approved",
    requestAuthorization: async () => "approved",
    schedule: async () => {},
    cancel: async () => {},
    getScheduled: async () => [],
    getDeliveries: async () => [],
    subscribe: () => () => {},
  };
}

describe("SettingsScreen", () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    useSettingsStore.setState(DEFAULT_SETTINGS);
    useNotificationPreferencesStore.setState(DEFAULT_NOTIFICATION_PREFERENCES);
  });

  it("shows the grace control and explains the app-fixed walking values", async () => {
    await render(<SettingsScreen />);

    expect(screen.getByRole("header", { name: "Settings" })).toBeOnTheScreen();
    expect(screen.getByRole("header", { name: "Walk & Scroll" })).toBeOnTheScreen();
    expect(screen.getByText("Choose a grace period")).toBeOnTheScreen();
    expect(screen.getByText("Around 60–70 steps/min")).toBeOnTheScreen();
    expect(
      screen.getByText("Fixed to keep walking detection trustworthy."),
    ).toBeOnTheScreen();
    expect(screen.getByText("15 minutes")).toBeOnTheScreen();
    expect(
      screen.getByText("Fixed to Apple's minimum monitoring interval."),
    ).toBeOnTheScreen();
  });

  it("lets the user choose and see an allowed grace period", async () => {
    await render(<SettingsScreen />);

    await fireEvent.press(screen.getByRole("button", { name: "2 minutes" }));

    await waitFor(() => {
      expect(
        screen.getByLabelText("Selected grace period: 2 minutes"),
      ).toBeOnTheScreen();
    });
  });

  it("mounts the real signed-out account surface and real support actions", async () => {
    await render(<SettingsScreen />);

    // Account hydrates from storage, so this one has to be awaited.
    expect(await screen.findByText("Signed out")).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Sign in" })).toBeEnabled();
    expect(
      screen.getByRole("button", { name: "Create account" }),
    ).toBeEnabled();
    expect(
      screen.getByText(
        "Your conditions, earning history, and locks stay on this device.",
      ),
    ).toBeOnTheScreen();
    expect(
      screen.getByRole("button", { name: "Contact support" }),
    ).toBeOnTheScreen();
    expect(
      screen.getByRole("button", { name: "Request a feature" }),
    ).toBeOnTheScreen();
  });

  it("shows the debug-menu entry in development builds", async () => {
    await render(<SettingsScreen />);

    expect(screen.getByText("Debug menu")).toBeOnTheScreen();
  });

  it("surfaces the three ship-silent notification controls in Settings", async () => {
    await render(
      <SettingsScreen notificationModule={approvedNotificationModule()} />,
    );

    expect(
      screen.getByRole("header", { name: "Notifications" }),
    ).toBeOnTheScreen();
    expect(screen.getByLabelText("Afternoon nudge")).toBeOnTheScreen();
    expect(screen.getByLabelText("Weekly recap")).toBeOnTheScreen();
    expect(screen.getByLabelText("Streak last call")).toBeOnTheScreen();
    expect(screen.getByLabelText("Selected nudge time: 3:00 PM")).toBeOnTheScreen();
  });

  it("opens the direct App Store review path from the manual Rate row", async () => {
    const manualRate = jest.fn().mockResolvedValue(true);
    await render(<SettingsScreen reviewCoordinator={{ manualRate }} />);

    await fireEvent.press(screen.getByRole("button", { name: "Rate ExcerLock" }));

    expect(manualRate).toHaveBeenCalledTimes(1);
  });
});
