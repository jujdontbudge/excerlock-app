import type { CatalogEntry } from "./catalog-types";
import type {
  ConfiguredCondition,
  EvaluationClock,
  EvaluationOutcome,
  EventCondition,
  EventFiredOutcome,
  RateCondition,
  RateCreditOutcome,
  SignalTimelineRow,
} from "./evaluation-types";
import { getCatalogEntry } from "./picker";

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

function eligibleRows(
  condition: ConfiguredCondition,
  entry: CatalogEntry,
  timeline: readonly SignalTimelineRow[],
  clock: EvaluationClock,
): SignalTimelineRow[] {
  return timeline
    .filter(
      (row) =>
        row.atMs >= clock.dayStartMs &&
        row.atMs <= clock.nowMs &&
        matchesCondition(condition, entry, row),
    )
    .sort((left, right) => left.atMs - right.atMs);
}

function evaluateEvent(
  condition: EventCondition,
  rows: readonly SignalTimelineRow[],
): readonly EventFiredOutcome[] {
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

function rateOutcome(
  condition: RateCondition,
  atMs: number,
  sourceEventId: string,
  signalDelta: number,
): RateCreditOutcome {
  return {
    type: "rateCredit",
    atMs,
    conditionId: condition.id,
    sourceEventId,
    signalDelta,
    deltaMinutes:
      signalDelta * condition.settings.reward.minutesPerUnit,
  };
}

function evaluateRate(
  condition: RateCondition,
  rows: readonly SignalTimelineRow[],
): readonly RateCreditOutcome[] {
  const outcomes: RateCreditOutcome[] = [];
  const seenSamples = new Set<string>();
  let cumulativeValue = 0;

  for (const row of rows) {
    if (
      row.event !== "signalSnapshot" &&
      row.event !== "signalDelta"
    ) {
      continue;
    }
    if (seenSamples.has(row.payload.sampleId)) {
      continue;
    }
    seenSamples.add(row.payload.sampleId);

    const signalDelta =
      row.event === "signalSnapshot"
        ? row.payload.value - cumulativeValue
        : row.payload.delta;
    cumulativeValue += signalDelta;

    if (signalDelta !== 0) {
      outcomes.push(
        rateOutcome(
          condition,
          row.atMs,
          row.payload.sampleId,
          signalDelta,
        ),
      );
    }
  }

  return outcomes;
}

function isEventCondition(
  condition: ConfiguredCondition,
): condition is EventCondition {
  return condition.settings.kind === "event";
}

export function evaluateCondition(
  condition: ConfiguredCondition,
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

  const rows = eligibleRows(condition, entry, timeline, clock);
  return isEventCondition(condition)
    ? evaluateEvent(condition, rows)
    : evaluateRate(condition, rows);
}
