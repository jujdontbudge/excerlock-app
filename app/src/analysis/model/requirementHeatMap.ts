import {
  RATE_STREAK_FLOOR_MINUTES,
  STATE_STREAK_FLOOR_MINUTES,
  type ConditionDaySummary,
  type DaySummary,
} from "@excerlock/ledger";

import { weekOffset, type Weekday } from "./calendar";
import { DEFAULT_WEEK_STARTS_ON } from "./selectors";

export type RequirementMetKind = "event" | "rate" | "state";

export type RequirementHeatMapCell =
  | Readonly<{
      dayIndex: number;
      state: "metByEvent" | "metByRate" | "metByState";
      qualifiedConditionId: string;
    }>
  | Readonly<{
      dayIndex: number;
      state: "blank";
    }>;

export type RequirementHeatMap = Readonly<{
  weeks: readonly (readonly RequirementHeatMapCell[])[];
}>;

type RequirementHeatMapOptions = Readonly<{
  weekStartsOn?: Weekday;
  throughDayIndex?: number;
}>;

/**
 * Builds whole week columns around the recorded run. Blank padding preserves
 * the calendar without pretending pre-history or future days were observed.
 */
export function buildRequirementHeatMap(
  days: readonly DaySummary[],
  {
    weekStartsOn = DEFAULT_WEEK_STARTS_ON,
    throughDayIndex = days.at(-1)?.dayIndex,
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
    const winner = day === undefined ? undefined : firstQualifiedCondition(day);
    cells.push(
      dayIndex < first.dayIndex || dayIndex > throughDayIndex || winner === undefined
        ? { dayIndex, state: "blank" }
        : {
            dayIndex,
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

type QualifiedCondition = Readonly<{
  conditionId: string;
  kind: RequirementMetKind;
  firstQualifiedAtMs: number;
}>;

function firstQualifiedCondition(
  day: Pick<DaySummary, "conditions">,
): QualifiedCondition | undefined {
  let winner: QualifiedCondition | undefined;

  for (const [conditionId, condition] of Object.entries(day.conditions)) {
    const { firstQualifiedAtMs } = condition;
    const kind = qualifiedKind(condition);
    if (firstQualifiedAtMs === undefined || kind === undefined) continue;

    const candidate = { conditionId, kind, firstQualifiedAtMs };
    if (
      winner === undefined ||
      candidate.firstQualifiedAtMs < winner.firstQualifiedAtMs ||
      (candidate.firstQualifiedAtMs === winner.firstQualifiedAtMs &&
        candidate.conditionId.localeCompare(winner.conditionId) < 0)
    ) {
      winner = candidate;
    }
  }

  return winner;
}

function qualifiedKind(
  condition: ConditionDaySummary,
): RequirementMetKind | undefined {
  if (condition.eventsFired > 0) return "event";
  if (condition.rateMinutes >= RATE_STREAK_FLOOR_MINUTES) return "rate";
  if (condition.stateSustainedMinutes >= STATE_STREAK_FLOOR_MINUTES) return "state";
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
