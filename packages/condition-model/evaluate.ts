import { validateActiveWindow } from "./active-window";
import { evaluateEventCondition } from "./evaluate-event";
import { evaluateRateCondition } from "./evaluate-rate";
import { evaluateStateCondition } from "./evaluate-state";
import { eligibleRows } from "./evaluation-shared";
import type {
  ConfiguredCondition,
  EvaluationClock,
  EvaluationOutcome,
  EventCondition,
  RateCondition,
  SignalTimelineRow,
} from "./evaluation-types";
import { getCatalogEntry } from "./picker";

function isEventCondition(
  condition: ConfiguredCondition,
): condition is EventCondition {
  return condition.settings.kind === "event";
}

function isRateCondition(
  condition: ConfiguredCondition,
): condition is RateCondition {
  return condition.settings.kind === "rate";
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
  validateActiveWindow(condition.activeWindow);

  const rows = eligibleRows(condition, entry, timeline, clock);
  if (isEventCondition(condition)) {
    return evaluateEventCondition(condition, rows, clock);
  }
  if (isRateCondition(condition)) {
    return evaluateRateCondition(condition, rows, clock);
  }
  return evaluateStateCondition(condition, rows, clock);
}

export function evaluateConditions(
  conditions: readonly ConfiguredCondition[],
  timeline: readonly SignalTimelineRow[],
  clock: EvaluationClock,
): readonly EvaluationOutcome[] {
  return conditions
    .flatMap((condition) => evaluateCondition(condition, timeline, clock))
    .sort((left, right) => left.atMs - right.atMs);
}
