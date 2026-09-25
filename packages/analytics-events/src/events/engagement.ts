import type { EmptyProps, EventSpecMap } from '../types'

export type MilestoneCategory = 'streak' | 'activities' | 'time_reclaimed'

export type NotificationType = 'nudge' | 'weekly_recap' | 'streak_last_call'

export type ShareCardKind = 'milestone' | 'recap'
export type ShareCardFormat = 'story' | 'feed'

export const engagementEvents = {
  milestone_unlocked: { owner: 'client', transmittedProperties: [] },
  share_card_shared: { owner: 'client', transmittedProperties: ['card', 'format'] },
  notification_toggled: { owner: 'client', transmittedProperties: ['type', 'is_enabled'] },
  notification_opened: { owner: 'client', transmittedProperties: ['type'] },
  rating_prompt_shown: { owner: 'client', transmittedProperties: ['source'] },
} as const satisfies EventSpecMap

export interface EngagementEventProps {
  milestone_unlocked: EmptyProps
  share_card_shared: { card: ShareCardKind; format: ShareCardFormat }
  notification_toggled: { type: NotificationType; is_enabled: boolean }
  notification_opened: { type: NotificationType }
  rating_prompt_shown: { source: 'unlock_moment' | 'settings' }
}
