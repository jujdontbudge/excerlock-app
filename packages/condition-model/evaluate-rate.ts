import { isInsideActiveWindow } from "./active-window";
import type {
  EvaluationClock,
  RateCondition,
  RateCreditOutcome,
  SignalTimelineRow,
} from "./evaluation-types";

function outcome(
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

export function evaluateRateCondition(
  condition: RateCondition,
  rows: readonly SignalTimelineRow[],
  clock: EvaluationClock,
): readonly RateCreditOutcome[] {
  const outcomes: RateCreditOutcome[] = [];
  const seenSamples = new Set<string>();
  let cumulativeValue = 0;

  for (const row of rows) {
    if (row.event !== "signalSnapshot" && row.event !== "signalDelta") {
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

    if (
      signalDelta !== 0 &&
      isInsideActiveWindow(
        condition.activeWindow,
        row.atMs,
        clock.dayStartMs,
      )
    ) {
      outcomes.push(
        outcome(condition, row.atMs, row.payload.sampleId, signalDelta),
      );
    }
  }

  return outcomes;
}
