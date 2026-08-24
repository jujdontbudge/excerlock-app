jest.mock("expo-notifications", () => ({
  IosAlertStyle: { NONE: 0, BANNER: 1 },
  IosAllowsPreviews: { NEVER: 0, ALWAYS: 1 },
  IosAuthorizationStatus: {
    AUTHORIZED: 2,
    DENIED: 1,
    EPHEMERAL: 4,
    NOT_DETERMINED: 0,
    PROVISIONAL: 3,
  },
  PermissionStatus: {
    DENIED: "denied",
    GRANTED: "granted",
    UNDETERMINED: "undetermined",
  },
  SchedulableTriggerInputTypes: { DATE: "date" },
  cancelScheduledNotificationAsync: jest.fn().mockResolvedValue(undefined),
  getPermissionsAsync: jest.fn(),
  requestPermissionsAsync: jest.fn(),
  scheduleNotificationAsync: jest.fn().mockResolvedValue(
    "excerlock.walk-lease-warning.v1",
  ),
}));

import * as Notifications from "expo-notifications";

import {
  ExpoWalkLeaseWarningNotifier,
  WALK_LEASE_WARNING_ID,
} from "../walkLeaseWarning";

describe("ExpoWalkLeaseWarningNotifier", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("replaces one authorized operational warning 30 seconds before expiry", async () => {
    jest.mocked(Notifications.getPermissionsAsync).mockResolvedValue({
      status: Notifications.PermissionStatus.GRANTED,
      canAskAgain: true,
      expires: "never",
      granted: true,
      ios: {
        allowsAlert: true,
        allowsBadge: false,
        allowsCriticalAlerts: false,
        allowsDisplayInCarPlay: false,
        allowsDisplayInNotificationCenter: true,
        allowsDisplayOnLockScreen: true,
        allowsSound: true,
        alertStyle: Notifications.IosAlertStyle.BANNER,
        allowsPreviews: Notifications.IosAllowsPreviews.ALWAYS,
        providesAppNotificationSettings: false,
        allowsAnnouncements: false,
        status: Notifications.IosAuthorizationStatus.AUTHORIZED,
      },
    });
    const notifier = new ExpoWalkLeaseWarningNotifier();
    const leaseEndsAtMs = 15 * 60_000;

    await notifier.schedule(leaseEndsAtMs);

    expect(
      Notifications.cancelScheduledNotificationAsync,
    ).toHaveBeenCalledWith(WALK_LEASE_WARNING_ID);
    expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledWith({
      identifier: WALK_LEASE_WARNING_ID,
      content: {
        title: "Your walk check is almost due",
        body: "Pick up your phone to keep apps open, or return to ExcerLock for a quick scan.",
        sound: "default",
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: new Date(leaseEndsAtMs - 30_000),
      },
    });
    expect(Notifications.requestPermissionsAsync).not.toHaveBeenCalled();
  });

  it("stays silent and never prompts when notification permission is absent", async () => {
    jest.mocked(Notifications.getPermissionsAsync).mockResolvedValue({
      status: Notifications.PermissionStatus.UNDETERMINED,
      canAskAgain: true,
      expires: "never",
      granted: false,
      ios: {
        allowsAlert: null,
        allowsBadge: null,
        allowsCriticalAlerts: null,
        allowsDisplayInCarPlay: null,
        allowsDisplayInNotificationCenter: null,
        allowsDisplayOnLockScreen: null,
        allowsSound: null,
        alertStyle: Notifications.IosAlertStyle.NONE,
        allowsPreviews: Notifications.IosAllowsPreviews.NEVER,
        providesAppNotificationSettings: false,
        allowsAnnouncements: null,
        status: Notifications.IosAuthorizationStatus.NOT_DETERMINED,
      },
    });
    const notifier = new ExpoWalkLeaseWarningNotifier();

    await notifier.schedule(15 * 60_000);

    expect(
      Notifications.cancelScheduledNotificationAsync,
    ).toHaveBeenCalledWith(WALK_LEASE_WARNING_ID);
    expect(Notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
    expect(Notifications.requestPermissionsAsync).not.toHaveBeenCalled();
  });
});
