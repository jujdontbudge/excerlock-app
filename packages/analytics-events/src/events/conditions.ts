import type { EmptyProps, EventSpecMap } from '../types'

/** PRD §3.3 — the single earn primitive's three kinds. */
export type ConditionKind = 'state' | 'event' | 'rate'

/** How an earn credited the balance (§3.3 payout menu + rate crediting). */
export type PayoutKind = 'fixed_chunk' | 'rest_of_day' | 'set_period' | 'rate_credit'

/**
 * Condition lifecycle + earns — client-owned: the whole economy evaluates
 * on-device (PRD §5), so the client is the authoritative emitter.
 */
export const conditionEvents = {
  condition_created: { owner: 'client' },
  condition_edited: { owner: 'client' },
  condition_deleted: { owner: 'client' },
  earn_claimed: { owner: 'client' },
  sick_day_override_used: { owner: 'client' },
} as const satisfies EventSpecMap

/** Low-cardinality identity of a condition — kind + signal + source slugs, never user text. */
type ConditionShapeProps = {
  kind: ConditionKind
  signal: string
  source: string
}

export interface ConditionEventProps {
  condition_created: ConditionShapeProps
  condition_edited: ConditionShapeProps
  condition_deleted: ConditionShapeProps
  earn_claimed: ConditionShapeProps & { payout: PayoutKind; minutes_earned: number }
  // D12: the override's free-text reason stays on-device — the event carries nothing.
  sick_day_override_used: EmptyProps
}
