import {
  evaluateConditions,
  type ConfiguredCondition,
  type Signal,
  type SignalTimelineRow,
} from "@excerlock/condition-model";
import {
  dayIndexFor,
  dayStartMs,
  type JournalEntry,
} from "@excerlock/ledger";

import { toLedgerPayout } from "./ledgerPayout";
import type { SignalReading } from "./reading";

export function healthEventJournalEntries(
  conditions: readonly ConfiguredCondition[],
  reading: SignalReading,
  atMs: number,
  dayBoundaryOffsetMinutes: number,
): readonly JournalEntry[] {
  const dayIndex = dayIndexFor(atMs, dayBoundaryOffsetMinutes);
  const timeline = Object.entries(reading.totals).flatMap(
    ([signal, value]): readonly SignalTimelineRow[] =>
      value === undefined
        ? []
        : [
            {
              atMs,
              event: "signalSnapshot",
              payload: {
                sampleId: `health-claim:${dayIndex}:${signal}`,
                signal: signal as Signal,
                source: "appleHealth",
                value,
              },
            },
          ],
  );
  const healthEvents = conditions.filter(
    (condition) =>
      condition.source === "appleHealth" &&
      condition.settings.kind === "event",
  );

  return evaluateConditions(healthEvents, timeline, {
    dayStartMs: dayStartMs(dayIndex, dayBoundaryOffsetMinutes),
    nowMs: atMs,
  }).flatMap((outcome): readonly JournalEntry[] =>
    outcome.type === "eventFired"
      ? [
          {
            kind: "earn",
            source: "home",
            id: `${outcome.conditionId}:${dayIndex}`,
            atMs: outcome.atMs,
            conditionId: outcome.conditionId,
            payout: toLedgerPayout(outcome.reward),
          },
        ]
      : [],
  );
}
