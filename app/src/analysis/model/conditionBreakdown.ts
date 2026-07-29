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
      };
      totals.set(conditionId, {
        earnedMinutes: accumulated.earnedMinutes + (condition.earnedMinutes ?? 0),
        hasMissingAttribution:
          accumulated.hasMissingAttribution || condition.earnedMinutes === undefined,
      });
    }
  }

  return [...totals.entries()]
    .map(([conditionId, accumulated]): ConditionBreakdownItem => {
      const base = {
        conditionId,
        name: conditionNames[conditionId] ?? conditionId,
      };
      return accumulated.hasMissingAttribution
        ? { ...base, status: "notRecorded", earnedMinutes: null }
        : {
            ...base,
            status: "recorded",
            earnedMinutes: accumulated.earnedMinutes,
          };
    })
    .sort(
      (left, right) =>
        (right.earnedMinutes ?? -1) - (left.earnedMinutes ?? -1) ||
        left.name.localeCompare(right.name),
    );
}
