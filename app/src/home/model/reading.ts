import type { Signal } from "@excerlock/condition-model";

/**
 * What Home knows about today's signals right now: cumulative totals per signal
 * and which signals are true at this instant. It is a snapshot, never a history
 * — evaluation over timelines belongs to `@excerlock/condition-model`.
 */
export interface SignalReading {
  readonly totals: Readonly<Partial<Record<Signal, number>>>;
  readonly activeSignals: readonly Signal[];
}

export const EMPTY_READING: SignalReading = Object.freeze({
  totals: Object.freeze({}),
  activeSignals: Object.freeze([]),
});
