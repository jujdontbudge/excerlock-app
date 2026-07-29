import {
  desiredOsState,
  reduceLedger,
  type DesiredOsState,
  type Journal,
  type LedgerConfig,
} from "@excerlock/ledger";

import {
  resolveLockPrecedence,
  type LockPrecedenceDecision,
} from "../model/lockPrecedence";
import type { RecurringLockWindow } from "../model/recurringLockWindow";
import { isRecurringLockWindowActive } from "../model/windowOccurrences";

export interface DesiredLockState {
  readonly decision: LockPrecedenceDecision;
  readonly desired: DesiredOsState;
}

/** Composes Ledger's balance/ladder with the one explicit schedule policy. */
export function desiredLockState({
  journal,
  config,
  atMs,
  definitions,
  fullLock,
  walking,
}: {
  journal: Journal;
  config: LedgerConfig;
  atMs: number;
  definitions: readonly RecurringLockWindow[];
  fullLock: boolean;
  walking: boolean;
}): DesiredLockState {
  const ledgerDesired = desiredOsState(journal, config, atMs);
  const days = reduceLedger(journal, config, atMs);
  const today = days[days.length - 1]!;
  const holidayActive = today.holidays.some(
    ({ startMs, endMs }) => atMs >= startMs && atMs < endMs,
  );
  const decision = resolveLockPrecedence({
    earnedBalanceMinutes: holidayActive
      ? Number.POSITIVE_INFINITY
      : today.balance,
    activeWindow:
      definitions.length === 0
        ? null
        : isRecurringLockWindowActive(definitions, atMs),
    fullLock,
    walking,
  });
  return {
    decision,
    desired: {
      shields: decision.shields,
      drainThresholds: decision.drainsBalance
        ? ledgerDesired.drainThresholds
        : [],
    },
  };
}
