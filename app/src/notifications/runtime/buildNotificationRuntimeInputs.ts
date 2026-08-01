import {
  dayIndexFor,
  dayStartMs,
  daySummaries,
  type Journal,
  type LedgerConfig,
} from "@excerlock/ledger";

import {
  selectStreak,
  selectTimeReclaimed,
  selectWeek,
} from "@/analysis/model";
import { classifyScheduleDay, type ScheduleRules } from "@/schedule";
import type { WeekStart } from "@/settings";

import type { NotificationPlanningInput } from "../planning/dayPlan";
import type { NotificationPreferences } from "../store/notificationPreferencesStore";

export type NotificationRuntimeSnapshot = Readonly<{
  atMs: number;
  journal: Journal;
  ledgerConfig: LedgerConfig;
  schedule: ScheduleRules;
  preferences: NotificationPreferences;
  confessedDailyMinutes: number | null;
  weekStartsOn: WeekStart;
}>;

/** Builds the opened current day plus a full offline week of local requests. */
export function buildNotificationRuntimeInputs({
  atMs,
  journal,
  ledgerConfig,
  schedule,
  preferences,
  confessedDailyMinutes,
  weekStartsOn,
}: NotificationRuntimeSnapshot): readonly NotificationPlanningInput[] {
  const currentDayIndex = dayIndexFor(
    atMs,
    ledgerConfig.dayBoundaryOffsetMinutes,
  );

  return Array.from({ length: 8 }, (_, offset) =>
    planningInput(currentDayIndex + offset, offset === 0),
  );

  function planningInput(
    targetDayIndex: number,
    appOpenedToday: boolean,
  ): NotificationPlanningInput {
    const throughMs =
      targetDayIndex === currentDayIndex
        ? atMs
        : dayStartMs(targetDayIndex, ledgerConfig.dayBoundaryOffsetMinutes);
    const days = daySummaries(journal, ledgerConfig, throughMs);
    const target = days.find(({ dayIndex }) => dayIndex === targetDayIndex);
    const classifyDay = (dayIndex: number) =>
      classifyScheduleDay({ dayIndex, schedule });
    const streakBeforeTarget = selectStreak(
      days.filter(({ dayIndex }) => dayIndex < targetDayIndex),
      { classifyDay },
    ).current;
    const active = classifyDay(targetDayIndex).isActive;

    return {
      day: {
        dayIndex: targetDayIndex,
        dayStartMs: dayStartMs(
          targetDayIndex,
          ledgerConfig.dayBoundaryOffsetMinutes,
        ),
        isActiveDay: active,
        hasQualifyingActivity: target?.meaningfulActivity === true,
        appOpenedToday,
        streakRequirementMet:
          !active || target?.meaningfulActivity === true,
        streakDays: streakBeforeTarget,
      },
      week: { weekStartsOn },
      copyFacts: {
        reclaimedMinutesThisWeek: selectTimeReclaimed(
          selectWeek(days, { weekStartsOn }),
          confessedDailyMinutes,
        ).reclaimedMinutes,
        streakDays: streakBeforeTarget,
      },
      preferences,
    };
  }
}
