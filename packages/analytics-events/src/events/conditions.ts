import type { EventSpecMap } from '../types'

/** The four activities a condition can be built on (PRD §3.3). */
export type ActivityKind = 'walking' | 'gym' | 'running' | 'biking'

/** PRD §3.3 — the single earn primitive's three kinds. */
export type ConditionKind = 'state' | 'event' | 'target'

/** `0` = Sunday, JS convention — the same numbering the domain's `Weekday` uses. */
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6

/**
 * How far into the schedule window the condition was met, as a coarse bucket. D12 forbids the
 * value itself: a precise minute offset, charted per person, is a movement log.
 */
export type WindowBucket = 'first_hour' | 'first_half' | 'second_half' | 'last_hour' | 'all_day'

const ACTIVITIES = ['walking', 'gym', 'running', 'biking'] as const
const CONDITION_KINDS = ['state', 'event', 'target'] as const
const WINDOW_BUCKETS = ['first_hour', 'first_half', 'second_half', 'last_hour', 'all_day'] as const

/**
 * Condition lifecycle + the moment a condition is met — client-owned: the whole economy evaluates
 * on-device (PRD §5), so the client is the authoritative emitter.
 */
export const conditionEvents = {
  condition_created: {
    owner: 'client',
    transmittedProperties: ['activity', 'mode'],
    enumProperties: { activity: ACTIVITIES, mode: CONDITION_KINDS },
  },
  condition_edited: {
    owner: 'client',
    transmittedProperties: ['activity', 'mode'],
    enumProperties: { activity: ACTIVITIES, mode: CONDITION_KINDS },
  },
  condition_deleted: {
    owner: 'client',
    transmittedProperties: ['activity', 'mode'],
    enumProperties: { activity: ACTIVITIES, mode: CONDITION_KINDS },
  },
  rule_met: {
    owner: 'client',
    transmittedProperties: ['activity', 'mode', 'day', 'window_bucket'],
    enumProperties: {
      activity: ACTIVITIES,
      mode: CONDITION_KINDS,
      window_bucket: WINDOW_BUCKETS,
    },
  },
  apps_unlocked_rest_of_day: {
    owner: 'client',
    transmittedProperties: ['activity'],
    enumProperties: { activity: ACTIVITIES },
  },
} as const satisfies EventSpecMap

export interface ConditionEventProps {
  condition_created: { activity: ActivityKind; mode: ConditionKind }
  condition_edited: { activity: ActivityKind; mode: ConditionKind }
  condition_deleted: { activity: ActivityKind; mode: ConditionKind }
  /**
   * D12: the goal, the progress and the metric all stay on-device. What crosses the boundary is
   * which kind of condition was met, on which weekday, and roughly how far into its window.
   */
  rule_met: {
    activity: ActivityKind
    mode: ConditionKind
    day: Weekday
    window_bucket: WindowBucket
  }
  apps_unlocked_rest_of_day: { activity: ActivityKind }
}
