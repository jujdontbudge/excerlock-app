/** Minutes of screen time. May be fractional (rate credits, clamped drains). */
export type Minutes = number

/** Base allowance of `Infinity` means the user has not set a budget (PRD §8: "unlimited until set"). */
export const UNLIMITED = Number.POSITIVE_INFINITY

export interface LedgerConfig {
  /** User-set day boundary, minutes after local midnight (0 = plain midnight). */
  dayBoundaryOffsetMinutes: number
  /** Per-day base allowance. 0 = Full Lock. UNLIMITED = no budget set. */
  baseAllowanceMinutes: Minutes
  /** Rollover of unspent balance into the next day. `null` = off. */
  rollover: { capMinutes: Minutes } | null
}

/** Event-condition payout menu (PRD §3.3). */
export type Payout =
  | { type: 'fixedChunk'; minutes: Minutes }
  | { type: 'restOfDay' }
  | { type: 'setPeriod'; minutes: Minutes }

interface EntryBase {
  /** Producing system, e.g. 'health', 'screentime', 'strava'. Half of the idempotence key. */
  source: string
  /** Stable id within the source (HealthKit anchor, workout UUID, tick event name…). */
  id: string
  /** Local wall-clock ms. */
  atMs: number
}

/** A condition-attributed entry — every earn traces back to the condition that produced it. */
interface ConditionEntryBase extends EntryBase {
  conditionId: string
}

export type JournalEntry =
  /** An event condition fired; its payout is applied at `atMs`. */
  | (ConditionEntryBase & { kind: 'earn'; payout: Payout })
  /** A rate condition's pro-rata delta (metric × ratio) as data arrived. */
  | (ConditionEntryBase & { kind: 'rateCredit'; minutes: Minutes })
  /** A state condition's completed sustained segment (for streak/stats floors — states never bank). */
  | (ConditionEntryBase & { kind: 'stateSustained'; minutes: Minutes })
  /** Locked-group usage reported by the screen-time drain ladder (normally 1 min per rung). */
  | (EntryBase & { kind: 'drainTick'; minutes: Minutes })

export interface Journal {
  entries: readonly JournalEntry[]
}
