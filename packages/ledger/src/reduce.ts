import { dayEndMs, dayIndexFor, dayStartMs, MIN_MS } from './day'
import { entryKey } from './journal'
import type { Journal, JournalEntry, LedgerConfig, Minutes } from './types'

/** A shield holiday: [startMs, endMs) during which shields are down and the balance does not drain. */
export interface Holiday {
  startMs: number
  endMs: number
}

export interface ConditionDayTotals {
  eventsFired: number
  rateMinutes: Minutes
  stateSustainedMinutes: Minutes
}

export interface DayState {
  dayIndex: number
  dayStartMs: number
  dayEndMs: number
  baseAllowance: Minutes
  rolloverIn: Minutes
  startBalance: Minutes
  /** Balance at the end of the evaluated window (end of day, or `throughMs` for the last day). */
  balance: Minutes
  /** fixedChunk + rateCredit minutes banked today. Holiday payouts bank nothing. */
  earnedMinutes: Minutes
  /** Minutes actually deducted from the balance. */
  spentMinutes: Minutes
  /** All locked-group usage reported today, including holiday usage and the clamped remainder. */
  usageMinutes: Minutes
  holidays: readonly Holiday[]
  perCondition: Readonly<Record<string, ConditionDayTotals>>
}

const KIND_ORDER: Record<JournalEntry['kind'], number> = {
  earn: 0,
  rateCredit: 1,
  stateSustained: 2,
  drainTick: 3,
}

/** Deterministic replay order: time, then earns before drains at the same instant, then key. */
function compareEntries(a: JournalEntry, b: JournalEntry): number {
  return a.atMs - b.atMs || KIND_ORDER[a.kind] - KIND_ORDER[b.kind] || (entryKey(a) < entryKey(b) ? -1 : 1)
}

function inHoliday(atMs: number, holidays: readonly Holiday[]): boolean {
  return holidays.some((h) => atMs >= h.startMs && atMs < h.endMs)
}

function conditionTotals(
  perCondition: Record<string, ConditionDayTotals>,
  conditionId: string,
): ConditionDayTotals {
  return (perCondition[conditionId] ??= { eventsFired: 0, rateMinutes: 0, stateSustainedMinutes: 0 })
}

function reduceDay(
  dayIndex: number,
  entries: readonly JournalEntry[],
  config: LedgerConfig,
  rolloverIn: Minutes,
): DayState {
  const offset = config.dayBoundaryOffsetMinutes
  const endOfDay = dayEndMs(dayIndex, offset)
  const startBalance = config.baseAllowanceMinutes + rolloverIn
  const holidays: Holiday[] = []
  const perCondition: Record<string, ConditionDayTotals> = {}
  let balance = startBalance
  let earned = 0
  let spent = 0
  let usage = 0

  for (const entry of entries) {
    switch (entry.kind) {
      case 'earn': {
        const totals = conditionTotals(perCondition, entry.conditionId)
        totals.eventsFired += 1
        const { payout } = entry
        if (payout.type === 'fixedChunk') {
          balance += payout.minutes
          earned += payout.minutes
        } else {
          const holidayEnd =
            payout.type === 'restOfDay' ? endOfDay : Math.min(entry.atMs + payout.minutes * MIN_MS, endOfDay)
          holidays.push({ startMs: entry.atMs, endMs: holidayEnd })
        }
        break
      }
      case 'rateCredit': {
        conditionTotals(perCondition, entry.conditionId).rateMinutes += entry.minutes
        balance += entry.minutes
        earned += entry.minutes
        break
      }
      case 'stateSustained': {
        conditionTotals(perCondition, entry.conditionId).stateSustainedMinutes += entry.minutes
        break
      }
      case 'drainTick': {
        usage += entry.minutes
        if (!inHoliday(entry.atMs, holidays)) {
          const deducted = Math.min(balance, entry.minutes)
          balance -= deducted
          spent += deducted
        }
        break
      }
    }
  }

  return {
    dayIndex,
    dayStartMs: dayStartMs(dayIndex, offset),
    dayEndMs: endOfDay,
    baseAllowance: config.baseAllowanceMinutes,
    rolloverIn,
    startBalance,
    balance,
    earnedMinutes: earned,
    spentMinutes: spent,
    usageMinutes: usage,
    holidays,
    perCondition,
  }
}

/**
 * Replay the journal into one state record per ledger day, from the first entry's
 * day through the day containing `throughMs`. Entries after `throughMs` are
 * ignored, so this doubles as the "state as of `at`" query. Empty days between
 * entries are synthesized so rollover chains and summaries stay contiguous.
 */
export function reduceLedger(journal: Journal, config: LedgerConfig, throughMs: number): DayState[] {
  const offset = config.dayBoundaryOffsetMinutes
  const entries = journal.entries.filter((e) => e.atMs <= throughMs).sort(compareEntries)
  const lastDay = dayIndexFor(throughMs, offset)
  const firstEntry = entries[0]
  const firstDay = firstEntry ? Math.min(dayIndexFor(firstEntry.atMs, offset), lastDay) : lastDay

  const byDay = new Map<number, JournalEntry[]>()
  for (const entry of entries) {
    const day = dayIndexFor(entry.atMs, offset)
    const bucket = byDay.get(day)
    if (bucket) bucket.push(entry)
    else byDay.set(day, [entry])
  }

  const days: DayState[] = []
  let rolloverIn = 0
  for (let day = firstDay; day <= lastDay; day++) {
    const state = reduceDay(day, byDay.get(day) ?? [], config, rolloverIn)
    days.push(state)
    rolloverIn = config.rollover ? Math.min(config.rollover.capMinutes, state.balance) : 0
  }
  return days
}
