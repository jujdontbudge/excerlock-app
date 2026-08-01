jest.mock(
  "@react-native-async-storage/async-storage",
  () => require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);

import AsyncStorage from "@react-native-async-storage/async-storage";

import { MockNotificationModule } from "../MockNotificationModule";
import { NotificationScheduler } from "../NotificationScheduler";
import { ManualNotificationClock } from "../clock";
import type { NotificationTypeId } from "../model/catalog";
import type { NotificationDayFacts } from "../model/triggers";
import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  type NotificationPreferences,
} from "../store/notificationPreferencesStore";

const DAY_MS = 24 * 60 * 60 * 1000;
const MONDAY = 4;
const SUNDAY = 3;

const ACTIVE_DAY: NotificationDayFacts = {
  dayIndex: MONDAY,
  dayStartMs: MONDAY * DAY_MS,
  isActiveDay: true,
  hasQualifyingActivity: false,
  appOpenedToday: false,
  streakRequirementMet: false,
  streakDays: 12,
};

function preferences(
  ...enabled: NotificationTypeId[]
): NotificationPreferences {
  return {
    ...DEFAULT_NOTIFICATION_PREFERENCES,
    enabled: {
      afternoonNudge: enabled.includes("afternoonNudge"),
      weeklyRecap: enabled.includes("weeklyRecap"),
      streakLastCall: enabled.includes("streakLastCall"),
    },
  };
}

async function harness(day = ACTIVE_DAY) {
  const clock = new ManualNotificationClock(day.dayStartMs + 12 * 60 * 60 * 1000);
  const module = new MockNotificationModule({ clock });
  module.setNextAuthorizationResult("approved");
  await module.requestAuthorization();
  return {
    module,
    scheduler: new NotificationScheduler({ module, clock }),
  };
}

function input(
  enabled: NotificationPreferences,
  day = ACTIVE_DAY,
) {
  return {
    day,
    week: { weekStartsOn: 1 as const },
    copyFacts: {
      reclaimedMinutesThisWeek: 380,
      streakDays: day.streakDays,
    },
    preferences: enabled,
  };
}

describe("NotificationScheduler", () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it.each([
    ["afternoon nudge", "afternoonNudge", ACTIVE_DAY, 15 * 60],
    [
      "weekly recap",
      "weeklyRecap",
      {
        ...ACTIVE_DAY,
        dayIndex: SUNDAY,
        dayStartMs: SUNDAY * DAY_MS,
      },
      18 * 60,
    ],
    ["streak last call", "streakLastCall", ACTIVE_DAY, 21 * 60],
  ] as const)(
    "fires the %s trigger once when its type is enabled",
    async (_name, typeId, day, minuteOfDay) => {
      const { module, scheduler } = await harness(day);

      await scheduler.reconcileDay(input(preferences(typeId), day));
      await scheduler.reconcileDay(input(preferences(typeId), day));

      await expect(module.getScheduled()).resolves.toEqual([
        expect.objectContaining({
          id: `${typeId}:${day.dayIndex}`,
          typeId,
          deliverAtMs: day.dayStartMs + minuteOfDay * 60_000,
        }),
      ]);
    },
  );

  it("silences one type without disturbing the other eligible schedules", async () => {
    const sunday = {
      ...ACTIVE_DAY,
      dayIndex: SUNDAY,
      dayStartMs: SUNDAY * DAY_MS,
    };
    const { module, scheduler } = await harness(sunday);

    await scheduler.reconcileDay(
      input(
        preferences("afternoonNudge", "weeklyRecap", "streakLastCall"),
        sunday,
      ),
    );
    await expect(module.getScheduled()).resolves.toEqual([
      expect.objectContaining({ typeId: "weeklyRecap" }),
      expect.objectContaining({ typeId: "streakLastCall" }),
    ]);

    await scheduler.reconcileDay(
      input(preferences("afternoonNudge", "streakLastCall"), sunday),
    );

    await expect(module.getScheduled()).resolves.toEqual([
      expect.objectContaining({ typeId: "afternoonNudge" }),
      expect.objectContaining({ typeId: "streakLastCall" }),
    ]);
  });

  it("uses only the injected clock when deciding whether a schedule is still timely", async () => {
    const clock = new ManualNotificationClock(
      ACTIVE_DAY.dayStartMs + 15 * 60 * 60 * 1000 + 1,
    );
    const module = new MockNotificationModule({ clock });
    module.setNextAuthorizationResult("approved");
    await module.requestAuthorization();
    const scheduler = new NotificationScheduler({ module, clock });

    await scheduler.reconcileDay(
      input(preferences("afternoonNudge", "streakLastCall")),
    );

    await expect(module.getScheduled()).resolves.toEqual([
      expect.objectContaining({
        typeId: "streakLastCall",
        deliverAtMs: ACTIVE_DAY.dayStartMs + 21 * 60 * 60 * 1000,
      }),
    ]);
  });
});
