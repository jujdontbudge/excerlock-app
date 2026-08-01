import type { EmptyProps, EventSpecMap } from '../types'

/** The three milestone ladders (PRD §3.13 — 22 badges across these rows). */
export type MilestoneCategory = 'streak' | 'activities' | 'time_reclaimed'

/** The three opt-in push types (PRD §3.14 — all default OFF). */
export type NotificationType = 'nudge' | 'weekly_recap' | 'streak_last_call'

/** The two share-card templates and their render formats (PRD §3.13). */
export type ShareCardKind = 'milestone' | 'recap'
export type ShareCardFormat = 'story' | 'feed'

/**
 * Milestones, notifications, and growth-artifact events — client-owned:
 * milestones and recaps are pure on-device ledger math, notifications are
 * local-only in v1.
 */
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
  // Fired when a push deep-links the app open — the per-type open rate.
  notification_opened: { type: NotificationType }
  // §3.15 About: layered trigger anchored to the unlock moment.
  rating_prompt_shown: { source: 'unlock_moment' | 'settings' }
}
