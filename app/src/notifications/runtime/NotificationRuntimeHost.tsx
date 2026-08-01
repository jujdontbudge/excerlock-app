import { dayIndexFor, dayStartMs } from "@excerlock/ledger";
import { useEffect, useMemo, useState } from "react";

import { useHomeStore } from "@/home";
import { useConfessionStore } from "@/onboarding";
import { useScheduleStore } from "@/schedule";

import {
  SystemNotificationClock,
  type NotificationClock,
} from "../clock";
import {
  NotificationScheduler,
  type NotificationPlanningInput,
} from "../NotificationScheduler";
import { useNotificationPreferencesStore } from "../store/notificationPreferencesStore";
import { buildNotificationRuntimeInputs } from "./buildNotificationRuntimeInputs";

export interface NotificationDayReconciler {
  reconcileDay(
    input: NotificationPlanningInput,
  ): Promise<readonly unknown[]>;
}

export type NotificationRuntimeHostProps = Readonly<{
  reconciler?: NotificationDayReconciler;
  clock?: NotificationClock;
}>;

/** Keeps native local schedules aligned with the local-first app stores. */
export function NotificationRuntimeHost({
  reconciler,
  clock,
}: NotificationRuntimeHostProps = {}) {
  const runtimeClock = useMemo(
    () => clock ?? new SystemNotificationClock(),
    [clock],
  );
  const dayReconciler = useMemo(
    () => reconciler ?? new NotificationScheduler({ clock: runtimeClock }),
    [reconciler, runtimeClock],
  );
  const journal = useHomeStore((state) => state.journal);
  const ledgerConfig = useHomeStore((state) => state.ledgerConfig);
  const recurringRestWeekdays = useScheduleStore(
    (state) => state.recurringRestWeekdays,
  );
  const holidays = useScheduleStore((state) => state.holidays);
  const overrides = useScheduleStore((state) => state.overrides);
  const enabled = useNotificationPreferencesStore((state) => state.enabled);
  const afternoonNudgeMinuteOfDay = useNotificationPreferencesStore(
    (state) => state.afternoonNudgeMinuteOfDay,
  );
  const confessedDailyMinutes = useConfessionStore(
    (state) => state.confessedDailyMinutes,
  );
  const [dayVersion, setDayVersion] = useState(0);

  const inputs = useMemo(
    () =>
      buildNotificationRuntimeInputs({
        atMs: runtimeClock.nowMs(),
        journal,
        ledgerConfig,
        schedule: { recurringRestWeekdays, holidays, overrides },
        preferences: { enabled, afternoonNudgeMinuteOfDay },
        confessedDailyMinutes,
      }),
    [
      afternoonNudgeMinuteOfDay,
      confessedDailyMinutes,
      dayVersion,
      enabled,
      holidays,
      journal,
      ledgerConfig,
      overrides,
      recurringRestWeekdays,
      runtimeClock,
    ],
  );

  useEffect(() => {
    void Promise.all(inputs.map((input) => dayReconciler.reconcileDay(input)));
  }, [dayReconciler, inputs]);

  useEffect(() => {
    const nowMs = runtimeClock.nowMs();
    const currentDayIndex = dayIndexFor(
      nowMs,
      ledgerConfig.dayBoundaryOffsetMinutes,
    );
    const nextDayStartMs = dayStartMs(
      currentDayIndex + 1,
      ledgerConfig.dayBoundaryOffsetMinutes,
    );
    return runtimeClock.scheduleAt(nextDayStartMs, () => {
      setDayVersion((version) => version + 1);
    });
  }, [dayVersion, ledgerConfig.dayBoundaryOffsetMinutes, runtimeClock]);

  return null;
}
