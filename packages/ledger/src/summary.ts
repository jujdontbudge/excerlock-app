import { reduceLedger, type Holiday } from './reduce'
import {
  RATE_STREAK_FLOOR_MINUTES,
  STATE_STREAK_FLOOR_MINUTES,
} from './qualification'
import type { Journal, LedgerConfig, Minutes } from './types'

export {
  RATE_STREAK_FLOOR_MINUTES,
  STATE_STREAK_FLOOR_MINUTES,
} from './qualification'

export interface ConditionDaySummary {
  eventsFired: number
  rateMinutes: Minutes
  stateSustainedMinutes: Minutes
  /**
   * Minutes this condition actually banked today. Always present on summaries
   * produced by `daySummaries`; optional for compatibility with stored/manual
   * summaries created before attribution existed.
   */
  earnedMinutes?: Minutes
  /**
   * Local wall-clock timestamp of this condition's first qualifying outcome.
   * Present for qualifying conditions produced by `daySummaries`; optional for
   * compatibility with stored/manual summaries created before this existed.
   */
  firstQualifiedAtMs?: number
  /** Did this condition meet the §3.13 meaningful-activity bar today? */
  meaningfulActivity: boolean
}

/** One per-day record, kept indefinitely (#14) — feeds the Analysis heat map, streaks, Time Reclaimed. */
export interface DaySummary {
  dayIndex: number
  dayStartMs: number
  baseAllowance: Minutes
  rolloverIn: Minutes
  startBalance: Minutes
  endBalance: Minutes
  earnedMinutes: Minutes
  spentMinutes: Minutes
  /** Total locked-group usage (holiday + clamped usage included) — the Time-Reclaimed input. */
  usageMinutes: Minutes
  holidays: readonly Holiday[]
  conditions: Readonly<Record<string, ConditionDaySummary>>
  /** Any condition met its bar today (the streak's per-day predicate). */
  meaningfulActivity: boolean
  /** Activity count for the day: one per condition that met its bar (§3.13 activity definition). */
  meaningfulConditionCount: number
}

function isMeaningful(totals: {
  eventsFired: number
  rateMinutes: Minutes
  stateSustainedMinutes: Minutes
}): boolean {
  return (
    totals.eventsFired > 0 ||
    totals.rateMinutes >= RATE_STREAK_FLOOR_MINUTES ||
    totals.stateSustainedMinutes >= STATE_STREAK_FLOOR_MINUTES
  )
}

/** Per-day summary records from the first journal entry through `throughMs`, gap days included. */
export function daySummaries(journal: Journal, config: LedgerConfig, throughMs: number): DaySummary[] {
  return reduceLedger(journal, config, throughMs).map((day) => {
    const conditions: Record<string, ConditionDaySummary> = {}
    let meaningfulConditionCount = 0
    for (const [conditionId, totals] of Object.entries(day.perCondition)) {
      const meaningfulActivity = isMeaningful(totals)
      if (meaningfulActivity) meaningfulConditionCount += 1
      conditions[conditionId] = { ...totals, meaningfulActivity }
    }
    return {
      dayIndex: day.dayIndex,
      dayStartMs: day.dayStartMs,
      baseAllowance: day.baseAllowance,
      rolloverIn: day.rolloverIn,
      startBalance: day.startBalance,
      endBalance: day.balance,
      earnedMinutes: day.earnedMinutes,
      spentMinutes: day.spentMinutes,
      usageMinutes: day.usageMinutes,
      holidays: day.holidays,
      conditions,
      meaningfulActivity: meaningfulConditionCount > 0,
      meaningfulConditionCount,
    }
  })
}
