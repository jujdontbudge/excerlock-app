import type { EmptyProps, EventSpecMap } from '../types'

export type ConditionKind = 'state' | 'event' | 'rate'

export type PayoutKind = 'fixed_chunk' | 'rest_of_day' | 'set_period' | 'rate_credit'

export const conditionEvents = {
  bank_condition_created: { owner: 'client', transmittedProperties: ['activity', 'difficulty'] },
  offer_bought: { owner: 'client', transmittedProperties: ['offer_id'] },
  points_collected: { owner: 'client', transmittedProperties: [] },
  bank_emptied: { owner: 'client', transmittedProperties: [] },
  condition_created: { owner: 'client', transmittedProperties: [] },
  condition_edited: { owner: 'client', transmittedProperties: [] },
  condition_deleted: { owner: 'client', transmittedProperties: [] },
  earn_claimed: { owner: 'client', transmittedProperties: [] },
  sick_day_override_used: { owner: 'client', transmittedProperties: [] },
} as const satisfies EventSpecMap

export interface ConditionEventProps {
  bank_condition_created: { activity: 'walking' | 'gym'; difficulty: 'easy' | 'medium' | 'hard' }
  offer_bought: { offer_id: 'm15' | 'h1' | 'h3' | 'h6' }
  points_collected: EmptyProps
  bank_emptied: EmptyProps
  condition_created: EmptyProps
  condition_edited: EmptyProps
  condition_deleted: EmptyProps
  earn_claimed: EmptyProps
  sick_day_override_used: EmptyProps
}
