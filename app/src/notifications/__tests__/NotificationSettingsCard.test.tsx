jest.mock(
  "@react-native-async-storage/async-storage",
  () => require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);

import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react-native";

import { MockNotificationModule } from "../MockNotificationModule";
import { NotificationSettingsCard } from "../components/NotificationSettingsCard";
import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  useNotificationPreferencesStore,
} from "../store/notificationPreferencesStore";

async function toggle(title: string, on: boolean): Promise<void> {
  await fireEvent(
    screen.getByTestId(`notification-toggle-${title}`),
    "valueChange",
    on,
  );
}

describe("NotificationSettingsCard permission flow", () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    useNotificationPreferencesStore.setState(DEFAULT_NOTIFICATION_PREFERENCES);
  });

  it("primes an undecided user before requesting and enables only after approval", async () => {
    const module = new MockNotificationModule();
    module.setNextAuthorizationResult("approved");
    await render(<NotificationSettingsCard module={module} />);

    await waitFor(() => {
      expect(
        screen.getByLabelText("Notifications access: Not set up"),
      ).toBeOnTheScreen();
    });

    await toggle("afternoonNudge", true);

    expect(screen.getByRole("header", { name: "Choose what helps" })).toBeOnTheScreen();
    expect(
      screen.getByText(
        "Turn on only the reminders that keep your screen-time payoff within reach.",
      ),
    ).toBeOnTheScreen();
    expect(
      useNotificationPreferencesStore.getState().enabled.afternoonNudge,
    ).toBe(false);

    await fireEvent.press(screen.getByRole("button", { name: "Allow notifications" }));

    await waitFor(() => {
      expect(screen.getByLabelText("Notifications access: On")).toBeOnTheScreen();
    });
    expect(
      useNotificationPreferencesStore.getState().enabled.afternoonNudge,
    ).toBe(true);
    expect(useNotificationPreferencesStore.getState().enabled.weeklyRecap).toBe(
      false,
    );
    expect(
      useNotificationPreferencesStore.getState().enabled.streakLastCall,
    ).toBe(false);
  });

  it("dismisses the permission primer from its blurred background", async () => {
    const module = new MockNotificationModule();
    await render(<NotificationSettingsCard module={module} />);
    await waitFor(() => {
      expect(
        screen.getByLabelText("Notifications access: Not set up"),
      ).toBeOnTheScreen();
    });

    await toggle("weeklyRecap", true);
    await fireEvent.press(
      screen.getByRole("button", { name: "Dismiss notification primer" }),
    );

    expect(screen.queryByRole("header", { name: "Choose what helps" })).toBeNull();
    expect(useNotificationPreferencesStore.getState().enabled.weeklyRecap).toBe(false);
  });

  it("renders the granted state and skips the primer when iOS is already approved", async () => {
    const module = new MockNotificationModule();
    module.setNextAuthorizationResult("approved");
    await module.requestAuthorization();
    await render(<NotificationSettingsCard module={module} />);

    await waitFor(() => {
      expect(screen.getByLabelText("Notifications access: On")).toBeOnTheScreen();
    });

    await toggle("weeklyRecap", true);

    expect(screen.queryByRole("header", { name: "Choose what helps" })).toBeNull();
    expect(useNotificationPreferencesStore.getState().enabled.weeklyRecap).toBe(
      true,
    );
  });

  it("keeps the type silent after denial and offers the Settings recovery path", async () => {
    const module = new MockNotificationModule();
    module.setNextAuthorizationResult("denied");
    const openSettings = jest.fn();
    await render(
      <NotificationSettingsCard
        module={module}
        openSettings={openSettings}
      />,
    );
    await waitFor(() => {
      expect(
        screen.getByLabelText("Notifications access: Not set up"),
      ).toBeOnTheScreen();
    });

    await toggle("streakLastCall", true);
    await fireEvent.press(screen.getByRole("button", { name: "Allow notifications" }));

    await waitFor(() => {
      expect(screen.getByLabelText("Notifications access: Off")).toBeOnTheScreen();
    });
    expect(
      useNotificationPreferencesStore.getState().enabled.streakLastCall,
    ).toBe(false);
    expect(screen.getByText("Notifications are off")).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole("button", { name: "Open Settings" }));
    expect(openSettings).toHaveBeenCalledTimes(1);
  });

  it("surfaces every independent switch and the adjustable nudge time", async () => {
    const module = new MockNotificationModule();
    module.setNextAuthorizationResult("approved");
    await module.requestAuthorization();
    useNotificationPreferencesStore.setState({
      enabled: {
        afternoonNudge: true,
        weeklyRecap: true,
        streakLastCall: true,
      },
    });
    await render(<NotificationSettingsCard module={module} />);
    await waitFor(() => {
      expect(screen.getByLabelText("Notifications access: On")).toBeOnTheScreen();
    });

    expect(screen.getByLabelText("Afternoon nudge")).toBeOnTheScreen();
    expect(screen.getByLabelText("Weekly recap")).toBeOnTheScreen();
    expect(screen.getByLabelText("Streak last call")).toBeOnTheScreen();
    expect(screen.getByLabelText("Selected nudge time: 3:00 PM")).toBeOnTheScreen();

    await toggle("weeklyRecap", false);
    await fireEvent.press(screen.getByRole("button", { name: "4:00 PM" }));

    const state = useNotificationPreferencesStore.getState();
    expect(state.enabled.afternoonNudge).toBe(true);
    expect(state.enabled.weeklyRecap).toBe(false);
    expect(state.enabled.streakLastCall).toBe(true);
    expect(state.afternoonNudgeMinuteOfDay).toBe(16 * 60);
  });
});
