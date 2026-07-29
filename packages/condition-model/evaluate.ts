import type { CatalogEntry } from "./catalog-types";
import type {
  EvaluationClock,
  EvaluationOutcome,
  EventCondition,
  EventFiredOutcome,
  SignalTimelineRow,
} from "./evaluation-types";
import { getCatalogEntry } from "./picker";

function matchesCondition(
  condition: EventCondition,
  entry: CatalogEntry,
  row: SignalTimelineRow,
): boolean {
  return (
    row.payload.signal === entry.signal &&
    row.payload.source === condition.source &&
    (row.payload.placeId ?? null) === (condition.placeId ?? null)
  );
}

function canFire(
  condition: EventCondition,
  fireCount: number,
  lastFireAtMs: number | null,
  atMs: number,
): boolean {
  const cap = condition.settings.repeatable
    ? (condition.settings.perDayCap ?? Number.POSITIVE_INFINITY)
    : 1;
  return (
    fireCount < cap &&
    (lastFireAtMs === null ||
      atMs - lastFireAtMs >= condition.settings.cooldownMs)
  );
}

function eventOutcome(
  condition: EventCondition,
  atMs: number,
  sourceEventId: string,
): EventFiredOutcome {
  return {
    type: "eventFired",
    atMs,
    conditionId: condition.id,
    sourceEventId,
    reward: condition.settings.reward,
  };
}

export function evaluateCondition(
  condition: EventCondition,
  timeline: readonly SignalTimelineRow[],
  clock: EvaluationClock,
): readonly EvaluationOutcome[] {
  const entry = getCatalogEntry(condition.catalogId);
  if (entry.kind !== condition.settings.kind) {
    throw new Error(
      `Condition ${condition.id} configures ${condition.settings.kind} settings for a ${entry.kind} catalog entry.`,
    );
  }
  if (clock.nowMs < clock.dayStartMs) {
    throw new Error("nowMs must be at or after dayStartMs.");
  }

  const rows = timeline
    .filter(
      (row) =>
        row.atMs >= clock.dayStartMs &&
        row.atMs <= clock.nowMs &&
        matchesCondition(condition, entry, row),
    )
    .sort((left, right) => left.atMs - right.atMs);

  const outcomes: EventFiredOutcome[] = [];
  const seenOccurrences = new Set<string>();
  let cumulativeValue = 0;
  let lastFireAtMs: number | null = null;

  for (const row of rows) {
    if (row.event === "signalSnapshot") {
      const priorValue = cumulativeValue;
      cumulativeValue = row.payload.value;
      const threshold = condition.settings.threshold;
      if (
        threshold !== undefined &&
        priorValue < threshold &&
        cumulativeValue >= threshold &&
        canFire(condition, outcomes.length, lastFireAtMs, row.atMs)
      ) {
        outcomes.push(
          eventOutcome(condition, row.atMs, row.payload.sampleId),
        );
        lastFireAtMs = row.atMs;
      }
      continue;
    }

    if (row.event === "signalOccurrence") {
      if (seenOccurrences.has(row.payload.occurrenceId)) {
        continue;
      }
      seenOccurrences.add(row.payload.occurrenceId);
      const threshold = condition.settings.threshold;
      const meetsThreshold =
        threshold === undefined ||
        (row.payload.value !== undefined && row.payload.value >= threshold);

      if (
        meetsThreshold &&
        canFire(condition, outcomes.length, lastFireAtMs, row.atMs)
      ) {
        outcomes.push(
          eventOutcome(condition, row.atMs, row.payload.occurrenceId),
        );
        lastFireAtMs = row.atMs;
      }
    }
  }

  return outcomes;
}
