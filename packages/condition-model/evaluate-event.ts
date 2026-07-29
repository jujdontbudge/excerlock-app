import { isInsideActiveWindow } from "./active-window";
import type {
  EvaluationClock,
  EventCondition,
  EventFiredOutcome,
  SignalTimelineRow,
} from "./evaluation-types";

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

function outcome(
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

export function evaluateEventCondition(
  condition: EventCondition,
  rows: readonly SignalTimelineRow[],
  clock: EvaluationClock,
): readonly EventFiredOutcome[] {
  const outcomes: EventFiredOutcome[] = [];
  const seenOccurrences = new Set<string>();
  const seenSamples = new Set<string>();
  let rawCumulativeValue = 0;
  let earnedCumulativeValue = 0;
  let lastFireAtMs: number | null = null;

  for (const row of rows) {
    if (row.event === "signalSnapshot" || row.event === "signalDelta") {
      if (seenSamples.has(row.payload.sampleId)) {
        continue;
      }
      seenSamples.add(row.payload.sampleId);
      const signalDelta =
        row.event === "signalSnapshot"
          ? row.payload.value - rawCumulativeValue
          : row.payload.delta;
      rawCumulativeValue += signalDelta;
      if (
        !isInsideActiveWindow(
          condition.activeWindow,
          row.atMs,
          clock.dayStartMs,
        )
      ) {
        continue;
      }

      const priorValue = earnedCumulativeValue;
      earnedCumulativeValue += signalDelta;
      const threshold = condition.settings.threshold;
      if (
        threshold !== undefined &&
        priorValue < threshold &&
        earnedCumulativeValue >= threshold &&
        canFire(condition, outcomes.length, lastFireAtMs, row.atMs)
      ) {
        outcomes.push(outcome(condition, row.atMs, row.payload.sampleId));
        lastFireAtMs = row.atMs;
      }
      continue;
    }

    if (row.event !== "signalOccurrence") {
      continue;
    }
    if (seenOccurrences.has(row.payload.occurrenceId)) {
      continue;
    }
    seenOccurrences.add(row.payload.occurrenceId);
    if (
      !isInsideActiveWindow(
        condition.activeWindow,
        row.atMs,
        clock.dayStartMs,
      )
    ) {
      continue;
    }

    const threshold = condition.settings.threshold;
    const meetsThreshold =
      threshold === undefined ||
      (row.payload.value !== undefined && row.payload.value >= threshold);
    if (
      meetsThreshold &&
      canFire(condition, outcomes.length, lastFireAtMs, row.atMs)
    ) {
      outcomes.push(outcome(condition, row.atMs, row.payload.occurrenceId));
      lastFireAtMs = row.atMs;
    }
  }

  return outcomes;
}
