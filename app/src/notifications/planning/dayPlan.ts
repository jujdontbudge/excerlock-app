import {
  getNotificationType,
  type NotificationTypeId,
} from "../model/catalog";
import {
  notificationContent,
  type NotificationCopyFacts,
} from "../model/copy";
import {
  MAX_PUSHES_PER_ROLLING_WEEK,
  countInRollingWindow,
  isWithinQuietHours,
  minuteOfDay,
} from "../model/deliveryRules";
import {
  STREAK_LAST_CALL_MINUTE_OF_DAY,
  WEEKLY_RECAP_MINUTE_OF_DAY,
  shouldFireAfternoonNudge,
  shouldFireStreakLastCall,
  shouldFireWeeklyRecap,
  type NotificationDayFacts,
  type NotificationWeekFacts,
} from "../model/triggers";
import type {
  DeliveryRecord,
  ScheduledNotification,
} from "../NotificationModule";
import {
  isNotificationEnabled,
  type NotificationPreferences,
} from "../store/notificationPreferencesStore";

const MINUTE_MS = 60 * 1000;

export type NotificationPlanningInput = Readonly<{
  day: NotificationDayFacts;
  week: NotificationWeekFacts;
  copyFacts: NotificationCopyFacts;
  preferences: NotificationPreferences;
}>;

type BuildDayPlanInput = NotificationPlanningInput &
  Readonly<{
    atMs: number;
    deliveries: readonly DeliveryRecord[];
  }>;

/** Pure plan builder: deterministic for the same facts, history, and clock value. */
export function buildDayPlan({
  day,
  week,
  copyFacts,
  preferences,
  atMs,
  deliveries,
}: BuildDayPlanInput): readonly ScheduledNotification[] {
  const candidates = [
    candidate(
      "afternoonNudge",
      day,
      preferences.afternoonNudgeMinuteOfDay,
      shouldFireAfternoonNudge(day),
      copyFacts,
      preferences,
    ),
    candidate(
      "weeklyRecap",
      day,
      WEEKLY_RECAP_MINUTE_OF_DAY,
      shouldFireWeeklyRecap(day, week),
      copyFacts,
      preferences,
    ),
    candidate(
      "streakLastCall",
      day,
      STREAK_LAST_CALL_MINUTE_OF_DAY,
      shouldFireStreakLastCall(day),
      copyFacts,
      preferences,
    ),
  ].flatMap((value) => (value === null ? [] : [value]));

  const timely = candidates.filter(
    ({ deliverAtMs }) =>
      deliverAtMs >= atMs && !isWithinQuietHours(minuteOfDay(deliverAtMs)),
  );
  const capped = timely
    .filter(({ typeId }) => getNotificationType(typeId).countsAgainstDailyCap)
    .sort(byPriorityDescending)
    .slice(0, 1);
  const dailyPlan = [
    ...capped,
    ...timely.filter(
      ({ typeId }) => !getNotificationType(typeId).countsAgainstDailyCap,
    ),
  ];
  const rollingHeadroom = Math.max(
    0,
    MAX_PUSHES_PER_ROLLING_WEEK - countInRollingWindow(deliveries, atMs),
  );

  return dailyPlan
    .sort(byPriorityDescending)
    .slice(0, rollingHeadroom)
    .sort(
      (left, right) =>
        left.deliverAtMs - right.deliverAtMs || left.id.localeCompare(right.id),
    );
}

function candidate(
  typeId: NotificationTypeId,
  day: NotificationDayFacts,
  deliveryMinute: number,
  triggerMatches: boolean,
  copyFacts: NotificationCopyFacts,
  preferences: NotificationPreferences,
): ScheduledNotification | null {
  if (!triggerMatches || !isNotificationEnabled(preferences, typeId)) {
    return null;
  }
  const type = getNotificationType(typeId);
  return Object.freeze({
    id: notificationScheduleId(typeId, day.dayIndex),
    typeId,
    content: notificationContent(typeId, copyFacts),
    route: type.route,
    deliverAtMs: day.dayStartMs + deliveryMinute * MINUTE_MS,
  });
}

export function notificationScheduleId(
  typeId: NotificationTypeId,
  dayIndex: number,
): string {
  return `${typeId}:${dayIndex}`;
}

function byPriorityDescending(
  left: ScheduledNotification,
  right: ScheduledNotification,
): number {
  return (
    getNotificationType(right.typeId).dailyCapPriority -
    getNotificationType(left.typeId).dailyCapPriority
  );
}
