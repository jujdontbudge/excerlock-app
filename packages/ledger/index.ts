/** @excerlock/ledger — the one public surface. Everything else is internal. */
export { remainingMinutes } from './src/balance'
export { DAY_MS, dayEndMs, dayIndexFor, dayStartMs, MIN_MS } from './src/day'
export { desiredOsState, type DesiredOsState } from './src/desired'
export { appendEntries, emptyJournal, entryKey } from './src/journal'
export { planDrainLadder, type LadderPlan } from './src/ladder'
export {
  reduceLedger,
  type ConditionDayTotals,
  type DayState,
  type Holiday,
} from './src/reduce'
export {
  daySummaries,
  RATE_STREAK_FLOOR_MINUTES,
  STATE_STREAK_FLOOR_MINUTES,
  type ConditionDaySummary,
  type DaySummary,
} from './src/summary'
export {
  UNLIMITED,
  type Journal,
  type JournalEntry,
  type LedgerConfig,
  type Minutes,
  type Payout,
} from './src/types'
export {
  extendWalkIncrement,
  isWalkWindowActive,
  planWalkIncrement,
  WALK_INCREMENT_MINUTES,
  type WalkWindow,
} from './src/walk'
