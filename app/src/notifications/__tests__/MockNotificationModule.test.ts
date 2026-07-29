jest.mock(
  "@react-native-async-storage/async-storage",
  () => require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);

import AsyncStorage from "@react-native-async-storage/async-storage";

import { MockNotificationModule } from "../MockNotificationModule";
import { ManualNotificationClock } from "../clock";
import type {
  NotificationModule,
  ScheduledNotification,
} from "../NotificationModule";

function notification(
  id: string,
  deliverAtMs: number,
): ScheduledNotification {
  return {
    id,
    typeId: "afternoonNudge",
    content: {
      title: "Your screen time is waiting",
      body: "A quick workout unlocks your apps for tonight.",
    },
    route: "/(tabs)",
    deliverAtMs,
  };
}

describe("MockNotificationModule", () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it("moves authorization from not determined to one terminal decision", async () => {
    const denied = new MockNotificationModule();

    expect(await denied.getAuthorizationStatus()).toBe("notDetermined");
    denied.setNextAuthorizationResult("denied");
    await expect(denied.requestAuthorization()).resolves.toBe("denied");
    denied.setNextAuthorizationResult("approved");
    await expect(denied.requestAuthorization()).resolves.toBe("denied");

    await AsyncStorage.clear();
    const approved = new MockNotificationModule();
    approved.setNextAuthorizationResult("approved");

    await expect(approved.requestAuthorization()).resolves.toBe("approved");
    await expect(approved.getAuthorizationStatus()).resolves.toBe("approved");
  });

  it("reconciles a deterministic id once and emits only schedule changes", async () => {
    const mock = new MockNotificationModule({
      clock: new ManualNotificationClock(0),
    });
    const notifications: NotificationModule = mock;
    mock.setNextAuthorizationResult("approved");
    await notifications.requestAuthorization();
    const observed: string[][] = [];
    const unsubscribe = notifications.subscribe((scheduled) => {
      observed.push(scheduled.map(({ id }) => id));
    });
    const first = notification("afternoonNudge:10", 10_000);

    await notifications.schedule(first);
    await notifications.schedule(first);

    await expect(notifications.getScheduled()).resolves.toEqual([first]);
    expect(observed).toEqual([["afternoonNudge:10"]]);

    await notifications.cancel(first.id);
    await notifications.cancel(first.id);
    expect(observed).toEqual([["afternoonNudge:10"], []]);

    unsubscribe();
    await notifications.schedule(notification("afternoonNudge:11", 11_000));
    expect(observed).toEqual([["afternoonNudge:10"], []]);
  });

  it("delivers in clock order exactly once under an injected clock", async () => {
    const clock = new ManualNotificationClock(1_000);
    const mock = new MockNotificationModule({ clock });
    mock.setNextAuthorizationResult("approved");
    await mock.requestAuthorization();
    await mock.schedule(notification("later", 3_000));
    await mock.schedule(notification("sooner", 2_000));

    await expect(mock.getScheduled()).resolves.toEqual([
      notification("sooner", 2_000),
      notification("later", 3_000),
    ]);

    clock.advanceTo(2_000);
    await expect(mock.getDeliveries()).resolves.toEqual([
      {
        id: "sooner",
        typeId: "afternoonNudge",
        deliveredAtMs: 2_000,
      },
    ]);

    clock.advanceTo(3_000);
    await expect(mock.getDeliveries()).resolves.toEqual([
      {
        id: "sooner",
        typeId: "afternoonNudge",
        deliveredAtMs: 2_000,
      },
      {
        id: "later",
        typeId: "afternoonNudge",
        deliveredAtMs: 3_000,
      },
    ]);
    await expect(mock.getScheduled()).resolves.toEqual([]);

    clock.advanceTo(4_000);
    await expect(mock.getDeliveries()).resolves.toHaveLength(2);
  });

  it("restores authorization and pending local schedules", async () => {
    const first = new MockNotificationModule({
      clock: new ManualNotificationClock(0),
    });
    first.setNextAuthorizationResult("approved");
    await first.requestAuthorization();
    await first.schedule(notification("persisted", 5_000));

    const clock = new ManualNotificationClock(0);
    const restored = new MockNotificationModule({ clock });

    await expect(restored.getAuthorizationStatus()).resolves.toBe("approved");
    await expect(restored.getScheduled()).resolves.toEqual([
      notification("persisted", 5_000),
    ]);

    clock.advanceTo(5_000);
    await expect(restored.getDeliveries()).resolves.toEqual([
      {
        id: "persisted",
        typeId: "afternoonNudge",
        deliveredAtMs: 5_000,
      },
    ]);
  });
});
