jest.mock("expo-notifications", () => ({
  IosAuthorizationStatus: {
    NOT_DETERMINED: 0,
    DENIED: 1,
    AUTHORIZED: 2,
    PROVISIONAL: 3,
    EPHEMERAL: 4,
  },
  PermissionStatus: {
    DENIED: "denied",
    GRANTED: "granted",
    UNDETERMINED: "undetermined",
  },
  SchedulableTriggerInputTypes: { DATE: "date" },
  getPermissionsAsync: jest.fn(),
  requestPermissionsAsync: jest.fn(),
  scheduleNotificationAsync: jest.fn().mockResolvedValue("afternoonNudge:42"),
}));

import * as Notifications from "expo-notifications";

import { ExpoNotificationModule } from "../native/ExpoNotificationModule";
import type { ScheduledNotification } from "../NotificationModule";

const AFTERNOON_NUDGE: ScheduledNotification = {
  id: "afternoonNudge:42",
  typeId: "afternoonNudge",
  content: {
    title: "Your screen time is waiting",
    body: "A quick workout unlocks your apps for tonight.",
  },
  route: "/(tabs)",
  deliverAtMs: 1_800_000,
};

describe("ExpoNotificationModule", () => {
  beforeEach(() => jest.clearAllMocks());

  it("schedules the resolved plan as a one-off local notification", async () => {
    const module = new ExpoNotificationModule();

    await module.schedule(AFTERNOON_NUDGE);

    expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledWith({
      identifier: "afternoonNudge:42",
      content: {
        title: "Your screen time is waiting",
        body: "A quick workout unlocks your apps for tonight.",
        sound: "default",
        data: {
          url: "/(tabs)",
          excerlockNotification: {
            version: 1,
            typeId: "afternoonNudge",
            deliverAtMs: 1_800_000,
          },
        },
      },
      trigger: {
        type: "date",
        date: new Date(1_800_000),
      },
    });
  });
});
