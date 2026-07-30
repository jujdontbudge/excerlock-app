import {
  getCatalogEntry,
  type ConfiguredCondition,
} from "@excerlock/condition-model";
import type { DaySummary } from "@excerlock/ledger";

type ConditionBreakdownBase = {
  conditionId: string;
  name: string;
};

export type ConditionBreakdownItem =
  | (ConditionBreakdownBase & {
      status: "recorded";
      earnedMinutes: number;
    })
  | (ConditionBreakdownBase & {
      status: "notRecorded";
      earnedMinutes: null;
    });

type AccumulatedEarnings = {
  earnedMinutes: number;
  hasMissingAttribution: boolean;
  firstQualifiedAtMs: number | undefined;
};

type RankedBreakdownItem = {
  item: ConditionBreakdownItem;
  firstQualifiedAtMs: number | undefined;
};

/** Resolve the mutable display names for the immutable ids stored in the ledger. */
export function conditionNameMap(
  conditions: readonly Pick<ConfiguredCondition, "id" | "catalogId">[],
): Readonly<Record<string, string>> {
  return Object.fromEntries(
    conditions.map(({ id, catalogId }) => [id, getCatalogEntry(catalogId).name]),
  );
}

/**
 * Banked minutes grouped by ledger condition id over exactly the supplied
 * window. Names are joined at this boundary because summaries deliberately
 * persist ids, not mutable display copy.
 */
export function selectConditionBreakdown(
  days: readonly DaySummary[],
  conditionNames: Readonly<Record<string, string>>,
): ConditionBreakdownItem[] {
  const totals = new Map<string, AccumulatedEarnings>();

  for (const day of days) {
    for (const [conditionId, condition] of Object.entries(day.conditions)) {
      const accumulated = totals.get(conditionId) ?? {
        earnedMinutes: 0,
        hasMissingAttribution: false,
        firstQualifiedAtMs: undefined,
      };
      const firstQualifiedAtMs = condition.firstQualifiedAtMs;
      totals.set(conditionId, {
        earnedMinutes: accumulated.earnedMinutes + (condition.earnedMinutes ?? 0),
        hasMissingAttribution:
          accumulated.hasMissingAttribution || condition.earnedMinutes === undefined,
        firstQualifiedAtMs:
          firstQualifiedAtMs === undefined
            ? accumulated.firstQualifiedAtMs
            : accumulated.firstQualifiedAtMs === undefined
              ? firstQualifiedAtMs
              : Math.min(accumulated.firstQualifiedAtMs, firstQualifiedAtMs),
      });
    }
  }

  return [...totals.entries()]
    .map(([conditionId, accumulated]): RankedBreakdownItem => {
      const base = {
        conditionId,
        name: conditionNames[conditionId] ?? conditionId,
      };
      return {
        firstQualifiedAtMs: accumulated.firstQualifiedAtMs,
        item: accumulated.hasMissingAttribution
          ? { ...base, status: "notRecorded", earnedMinutes: null }
          : {
              ...base,
              status: "recorded",
              earnedMinutes: accumulated.earnedMinutes,
            },
      };
    })
    .sort(
      (left, right) =>
        (right.item.earnedMinutes ?? -1) - (left.item.earnedMinutes ?? -1) ||
        compareFirstQualified(
          left.firstQualifiedAtMs,
          right.firstQualifiedAtMs,
        ) ||
        left.item.conditionId.localeCompare(right.item.conditionId),
    )
    .map(({ item }) => item);
}

/** Match the heat map: defined instants lead, and zero is a real instant. */
function compareFirstQualified(
  left: number | undefined,
  right: number | undefined,
): number {
  if (left === undefined && right !== undefined) return 1;
  if (left !== undefined && right === undefined) return -1;
  if (left === undefined || right === undefined) return 0;
  return left - right;
}
