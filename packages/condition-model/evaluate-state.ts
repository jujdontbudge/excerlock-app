import {
  activeWindowBoundaries,
  isInsideActiveWindow,
} from "./active-window";
import type {
  EvaluationClock,
  SignalTimelineRow,
  StateCondition,
  StateEnteredOutcome,
  StateExitedOutcome,
} from "./evaluation-types";

type StateOutcome = StateEnteredOutcome | StateExitedOutcome;
type StateRow = Extract<SignalTimelineRow, { event: "signalState" }>;
type StateAction =
  | { readonly atMs: number; readonly type: "row"; readonly row: StateRow }
  | { readonly atMs: number; readonly type: "windowStart" }
  | { readonly atMs: number; readonly type: "windowEnd" };

function actionsFor(
  condition: StateCondition,
  rows: readonly SignalTimelineRow[],
  clock: EvaluationClock,
): StateAction[] {
  return [
    ...rows
      .filter((row): row is StateRow => row.event === "signalState")
      .map((row) => ({ atMs: row.atMs, type: "row" as const, row })),
    ...activeWindowBoundaries(
      condition.activeWindow,
      clock.dayStartMs,
      clock.nowMs,
    ).map<StateAction>((boundary) =>
      boundary.type === "start"
        ? { atMs: boundary.atMs, type: "windowStart" }
        : { atMs: boundary.atMs, type: "windowEnd" },
    ),
  ].sort((left, right) => {
    if (left.atMs !== right.atMs) {
      return left.atMs - right.atMs;
    }
    const order = { windowEnd: 0, windowStart: 1, row: 2 } as const;
    return order[left.type] - order[right.type];
  });
}

export function evaluateStateCondition(
  condition: StateCondition,
  rows: readonly SignalTimelineRow[],
  clock: EvaluationClock,
): readonly StateOutcome[] {
  const outcomes: StateOutcome[] = [];
  const seenSamples = new Set<string>();
  let rawActive = false;
  let enforcing = false;
  let windowActive = isInsideActiveWindow(
    condition.activeWindow,
    clock.dayStartMs,
    clock.dayStartMs,
  );
  let pendingExit:
    | { readonly atMs: number; readonly sourceEventId: string }
    | undefined;

  function emitPendingExit(throughMs: number): void {
    if (pendingExit === undefined || pendingExit.atMs > throughMs) {
      return;
    }
    outcomes.push({
      type: "stateExited",
      atMs: pendingExit.atMs,
      conditionId: condition.id,
      sourceEventId: pendingExit.sourceEventId,
    });
    enforcing = false;
    pendingExit = undefined;
  }

  for (const action of actionsFor(condition, rows, clock)) {
    emitPendingExit(action.atMs);

    if (action.type === "windowStart") {
      windowActive = true;
      if (rawActive && !enforcing) {
        outcomes.push({
          type: "stateEntered",
          atMs: action.atMs,
          conditionId: condition.id,
          sourceEventId: `${condition.id}:window-start:${action.atMs}`,
        });
        enforcing = true;
      }
      continue;
    }

    if (action.type === "windowEnd") {
      windowActive = false;
      pendingExit = undefined;
      if (enforcing) {
        outcomes.push({
          type: "stateExited",
          atMs: action.atMs,
          conditionId: condition.id,
          sourceEventId: `${condition.id}:window-end:${action.atMs}`,
        });
        enforcing = false;
      }
      continue;
    }

    const { row } = action;
    if (seenSamples.has(row.payload.sampleId)) {
      continue;
    }
    seenSamples.add(row.payload.sampleId);

    rawActive = row.payload.active;
    if (rawActive) {
      if (windowActive && pendingExit !== undefined) {
        pendingExit = undefined;
      } else if (windowActive && !enforcing) {
        outcomes.push({
          type: "stateEntered",
          atMs: row.atMs,
          conditionId: condition.id,
          sourceEventId: row.payload.sampleId,
        });
        enforcing = true;
      }
    } else if (enforcing && pendingExit === undefined) {
      pendingExit = {
        atMs: row.atMs + condition.settings.exitGraceMs,
        sourceEventId: row.payload.sampleId,
      };
      emitPendingExit(row.atMs);
    }
  }

  emitPendingExit(clock.nowMs);
  return outcomes;
}
