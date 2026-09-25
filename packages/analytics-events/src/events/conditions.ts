import type { EmptyProps, EventSpecMap } from '../types'

export type ConditionKind = 'state' | 'event' | 'rate'

export type PayoutKind = 'fixed_chunk' | 'rest_of_day' | 'set_period' | 'rate_credit'

export const conditionEvents = {
  condition_created: { owner: 'client', transmittedProperties: [] },
  condition_edited: { owner: 'client', transmittedProperties: [] },
  condition_deleted: { owner: 'client', transmittedProperties: [] },
  earn_claimed: { owner: 'client', transmittedProperties: [] },
  sick_day_override_used: { owner: 'client', transmittedProperties: [] },
} as const satisfies EventSpecMap

export interface ConditionEventProps {
  condition_created: EmptyProps
  condition_edited: EmptyProps
  condition_deleted: EmptyProps
  earn_claimed: EmptyProps
  sick_day_override_used: EmptyProps
}
