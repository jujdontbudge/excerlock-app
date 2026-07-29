import type { DaySummary } from "@excerlock/ledger";

export type ConditionBreakdownItem = {
  conditionId: string;
  name: string;
  status: "recorded";
  earnedMinutes: number;
};

/**
 * Banked minutes grouped by ledger condition id over exactly the supplied
 * window. Names are joined at this boundary because summaries deliberately
 * persist ids, not mutable display copy.
 */
export function selectConditionBreakdown(
  days: readonly DaySummary[],
  conditionNames: Readonly<Record<string, string>>,
): ConditionBreakdownItem[] {
  const totals = new Map<string, number>();

  for (const day of days) {
    for (const [conditionId, condition] of Object.entries(day.conditions)) {
      totals.set(
        conditionId,
        (totals.get(conditionId) ?? 0) + (condition.earnedMinutes ?? 0),
      );
    }
  }

  return [...totals.entries()]
    .map(([conditionId, earnedMinutes]) => ({
      conditionId,
      name: conditionNames[conditionId] ?? conditionId,
      status: "recorded" as const,
      earnedMinutes,
    }))
    .sort(
      (left, right) =>
        right.earnedMinutes - left.earnedMinutes || left.name.localeCompare(right.name),
    );
}
