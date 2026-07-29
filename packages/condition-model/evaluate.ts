import type { CatalogEntry } from "./catalog-types";
import {
  activeWindowBoundaries,
  DAY_MS,
  isInsideActiveWindow,
  validateActiveWindow,
} from "./active-window";
import type {
  ConfiguredCondition,
  EvaluationClock,
  EvaluationOutcome,
  EventCondition,
  EventFiredOutcome,
  RateCondition,
  RateCreditOutcome,
  SignalTimelineRow,
  StateCondition,
  StateEnteredOutcome,
  StateExitedOutcome,
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
        row.atMs < clock.dayStartMs + DAY_MS &&
        row.atMs <= clock.nowMs &&
        matchesCondition(condition, entry, row),
    )
    .sort((left, right) => left.atMs - right.atMs);
}

function evaluateEvent(
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
    if (
      row.event === "signalSnapshot" ||
      row.event === "signalDelta"
    ) {
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
  clock: EvaluationClock,
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

    if (
      signalDelta !== 0 &&
      isInsideActiveWindow(
        condition.activeWindow,
        row.atMs,
        clock.dayStartMs,
      )
    ) {
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

function isRateCondition(
  condition: ConfiguredCondition,
): condition is RateCondition {
  return condition.settings.kind === "rate";
}

function evaluateState(
  condition: StateCondition,
  rows: readonly SignalTimelineRow[],
  clock: EvaluationClock,
): readonly (StateEnteredOutcome | StateExitedOutcome)[] {
  const outcomes: (StateEnteredOutcome | StateExitedOutcome)[] = [];
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

  type StateAction =
    | {
        readonly atMs: number;
        readonly type: "row";
        readonly row: Extract<
          SignalTimelineRow,
          { event: "signalState" }
        >;
      }
    | {
        readonly atMs: number;
        readonly type: "windowStart";
      }
    | {
        readonly atMs: number;
        readonly type: "windowEnd";
      };

  const actions: StateAction[] = [
    ...rows
      .filter(
        (
          row,
        ): row is Extract<SignalTimelineRow, { event: "signalState" }> =>
          row.event === "signalState",
      )
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

  for (const action of actions) {
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
    return evaluateEvent(condition, rows, clock);
  }
  if (isRateCondition(condition)) {
    return evaluateRate(condition, rows, clock);
  }
  return evaluateState(condition, rows, clock);
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
