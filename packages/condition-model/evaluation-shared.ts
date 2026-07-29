import { DAY_MS } from "./active-window";
import type { CatalogEntry } from "./catalog-types";
import type {
  ConfiguredCondition,
  EvaluationClock,
  SignalTimelineRow,
} from "./evaluation-types";

function matchesCondition(
  condition: ConfiguredCondition,
  entry: CatalogEntry,
  row: SignalTimelineRow,
): boolean {
  return (
    row.payload.signal === entry.signal &&
    row.payload.source === condition.source &&
    (row.payload.placeId ?? null) === (condition.placeId ?? null)
  );
}

export function eligibleRows(
  condition: ConfiguredCondition,
  entry: CatalogEntry,
  timeline: readonly SignalTimelineRow[],
  clock: EvaluationClock,
): SignalTimelineRow[] {
  return timeline
    .filter(
      (row) =>
        row.atMs >= clock.dayStartMs &&
        row.atMs < clock.dayStartMs + DAY_MS &&
        row.atMs <= clock.nowMs &&
        matchesCondition(condition, entry, row),
    )
    .sort((left, right) => left.atMs - right.atMs);
}
