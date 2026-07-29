import {
  desiredOsState,
  reduceLedger,
  type Journal,
  type LedgerConfig,
} from "@excerlock/ledger";

import { formatMinutes, heroBalance, type HeroBalance } from "./duration";

/** A state condition that is true right now — it holds the shields down without banking. */
export interface LiveState {
  readonly conditionId: string;
  readonly name: string;
}

export interface LockHeroModel {
  readonly status: "locked" | "unlocked";
  readonly balanceMinutes: number;
  readonly balance: HeroBalance;
  /** Today's stats row: what the conditions paid, and what the phone spent. */
  readonly earnedLabel: string;
  readonly spentLabel: string;
  readonly headline: string;
  /** The one line under the numeral — why the lock is in this state. */
  readonly detail: string;
}

export interface LockHeroInput {
  readonly journal: Journal;
  readonly config: LedgerConfig;
  /** Local wall-clock ms. The clock is always an argument — nothing here reads it. */
  readonly atMs: number;
  readonly liveStates: readonly LiveState[];
}

/**
 * The lock hero's view model.
 *
 * All balance and shield math belongs to `@excerlock/ledger`; this only composes
 * it with the one thing the ledger cannot see — a state condition that is true
 * right now (PRD §3.3: state conditions hold the shields open and never bank).
 */
export function deriveLockHero({
  journal,
  config,
  atMs,
  liveStates,
}: LockHeroInput): LockHeroModel {
  const days = reduceLedger(journal, config, atMs);
  const today = days[days.length - 1];
  const balanceMinutes = today?.balance ?? 0;
  const onHoliday =
    today?.holidays.some(({ startMs, endMs }) => atMs >= startMs && atMs < endMs) ?? false;
  const shieldsDown = desiredOsState(journal, config, atMs).shields === "down";
  const unlocked = shieldsDown || liveStates.length > 0;

  return {
    status: unlocked ? "unlocked" : "locked",
    balanceMinutes,
    balance: heroBalance(balanceMinutes),
    earnedLabel: formatMinutes(today?.earnedMinutes ?? 0),
    spentLabel: formatMinutes(today?.spentMinutes ?? 0),
    headline: unlocked ? "Apps are unlocked" : "Apps are locked",
    detail: detailFor({ liveStates, onHoliday, unlocked, balanceMinutes }),
  };
}

function detailFor({
  liveStates,
  onHoliday,
  unlocked,
  balanceMinutes,
}: {
  liveStates: readonly LiveState[];
  onHoliday: boolean;
  unlocked: boolean;
  balanceMinutes: number;
}): string {
  if (liveStates.length === 1) {
    return `${liveStates[0]!.name} is holding your apps open`;
  }
  if (liveStates.length > 1) {
    return `${liveStates.length} conditions are holding your apps open`;
  }
  if (onHoliday) {
    return "Unlocked for the rest of the day";
  }
  if (!Number.isFinite(balanceMinutes)) {
    return "No daily allowance set yet";
  }
  return unlocked
    ? `${formatMinutes(balanceMinutes)} of screen time left`
    : "Earn time to unlock your apps";
}
