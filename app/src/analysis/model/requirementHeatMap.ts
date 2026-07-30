import {
  DAY_MS,
  RATE_STREAK_FLOOR_MINUTES,
  STATE_STREAK_FLOOR_MINUTES,
  type ConditionDaySummary,
  type DaySummary,
} from "@excerlock/ledger";

import type { ScheduleDay } from "@/schedule";

import { dayLabel, weekOffset, type Weekday } from "./calendar";
import { DEFAULT_WEEK_STARTS_ON } from "./selectors";

export type RequirementMetKind = "event" | "rate" | "state";

export type QualifiedConditionDetail = Readonly<{
  conditionId: string;
  name: string;
  kind: RequirementMetKind;
  firstQualifiedAtMs: number;
}>;

export type RequirementDayDetail = Readonly<{
  earnedMinutes: number;
  qualifiedConditions: readonly QualifiedConditionDetail[];
  scheduleDay: ScheduleDay;
}>;

type ObservedRequirementCell = Readonly<{
  dayIndex: number;
  label: string;
  detail: RequirementDayDetail;
}>;

export type RequirementHeatMapCell =
  | (ObservedRequirementCell &
      Readonly<{
        state: "metByEvent" | "metByRate" | "metByState";
        qualifiedConditionId: string;
      }>)
  | Readonly<{
      dayIndex: number;
      label: string;
      state: "blank";
      blankReason: "beforeHistory" | "future";
    }>
  | (ObservedRequirementCell &
      Readonly<{
        state: "missed" | "rest";
      }>);

export type RequirementHeatMap = Readonly<{
  weeks: readonly (readonly RequirementHeatMapCell[])[];
}>;

export type RequirementDayClassifier = (dayIndex: number) => ScheduleDay;

type RequirementHeatMapOptions = Readonly<{
  weekStartsOn?: Weekday;
  throughDayIndex?: number;
  classifyDay?: RequirementDayClassifier;
  conditionNames?: Readonly<Record<string, string>>;
}>;

const ALL_DAYS_SCHEDULED_ACTIVE: RequirementDayClassifier = () => ({
  kind: "scheduledActive",
  isActive: true,
});

/**
 * Builds whole week columns around the recorded run. Blank padding preserves
 * the calendar without pretending pre-history or future days were observed.
 */
export function buildRequirementHeatMap(
  days: readonly DaySummary[],
  {
    weekStartsOn = DEFAULT_WEEK_STARTS_ON,
    throughDayIndex = days.at(-1)?.dayIndex,
    classifyDay = ALL_DAYS_SCHEDULED_ACTIVE,
    conditionNames = {},
  }: RequirementHeatMapOptions = {},
): RequirementHeatMap {
  const first = days[0];
  if (first === undefined || throughDayIndex === undefined) {
    return { weeks: [] };
  }

  const firstGridDay = first.dayIndex - weekOffset(first, weekStartsOn);
  const lastGridDay =
    throughDayIndex +
    (6 - weekOffset({ dayIndex: throughDayIndex }, weekStartsOn));
  const dayByIndex = new Map(days.map((day) => [day.dayIndex, day]));
  const cells: RequirementHeatMapCell[] = [];

  for (let dayIndex = firstGridDay; dayIndex <= lastGridDay; dayIndex += 1) {
    const day = dayByIndex.get(dayIndex);
    const label = dayLabel({
      dayIndex,
      dayStartMs: day?.dayStartMs ?? dayIndex * DAY_MS,
    });
    if (dayIndex < first.dayIndex || dayIndex > throughDayIndex) {
      cells.push({
        dayIndex,
        label,
        state: "blank",
        blankReason:
          dayIndex < first.dayIndex ? "beforeHistory" : "future",
      });
      continue;
    }

    const scheduleDay = classifyDay(dayIndex);
    const qualifiedConditions =
      day === undefined
        ? []
        : qualifiedConditionDetails(day, conditionNames);
    const winner = qualifiedConditions[0];
    const observed = {
      dayIndex,
      label,
      detail: {
        earnedMinutes: day?.earnedMinutes ?? 0,
        qualifiedConditions,
        scheduleDay,
      },
    };
    if (!scheduleDay.isActive) {
      cells.push({ ...observed, state: "rest" });
      continue;
    }

    cells.push(
      winner === undefined
        ? { ...observed, state: "missed" }
        : {
            ...observed,
            state: metState(winner.kind),
            qualifiedConditionId: winner.conditionId,
          },
    );
  }

  return {
    weeks: Array.from(
      { length: Math.ceil(cells.length / 7) },
      (_, index) => cells.slice(index * 7, index * 7 + 7),
    ),
  };
}

function qualifiedConditionDetails(
  day: Pick<DaySummary, "conditions">,
  conditionNames: Readonly<Record<string, string>>,
): QualifiedConditionDetail[] {
  return Object.entries(day.conditions)
    .flatMap(([conditionId, condition]): QualifiedConditionDetail[] => {
      const { firstQualifiedAtMs } = condition;
      const kind = qualifiedKind(condition);
      return firstQualifiedAtMs === undefined || kind === undefined
        ? []
        : [
            {
              conditionId,
              name: conditionNames[conditionId] ?? conditionId,
              kind,
              firstQualifiedAtMs,
            },
          ];
    })
    .sort(
      (left, right) =>
        left.firstQualifiedAtMs - right.firstQualifiedAtMs ||
        left.conditionId.localeCompare(right.conditionId),
    );
}

function qualifiedKind(
  condition: ConditionDaySummary,
): RequirementMetKind | undefined {
  if (condition.eventsFired > 0) return "event";
  if (condition.rateMinutes >= RATE_STREAK_FLOOR_MINUTES) return "rate";
  if (condition.stateSustainedMinutes >= STATE_STREAK_FLOOR_MINUTES) {
    return "state";
  }
  return undefined;
}

function metState(
  kind: RequirementMetKind,
): Extract<RequirementHeatMapCell, { qualifiedConditionId: string }>["state"] {
  switch (kind) {
    case "event":
      return "metByEvent";
    case "rate":
      return "metByRate";
    case "state":
      return "metByState";
  }
}
