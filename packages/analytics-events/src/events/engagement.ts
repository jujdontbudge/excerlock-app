import type { EventSpecMap } from '../types'

/**
 * The local notifications that ship (B14 amended by B30). There is no per-type toggle, so there
 * is no `notification_toggled` — only what a person opened.
 */
export type NotificationType = 'trial_reminder' | 'walk_lease_warning' | 'shield_open'

const NOTIFICATION_TYPES = ['trial_reminder', 'walk_lease_warning', 'shield_open'] as const
const RATING_SOURCES = ['unlock_moment', 'settings'] as const

/**
 * Engagement events. B16 cut badges and share cards for v1, so `milestone_unlocked` and
 * `share_card_shared` are gone; streaks and the weekly recap render from the on-device ledger and
 * emit nothing.
 */
export const engagementEvents = {
  notification_opened: {
    owner: 'client',
    transmittedProperties: ['type'],
    enumProperties: { type: NOTIFICATION_TYPES },
  },
  rating_prompt_shown: {
    owner: 'client',
    transmittedProperties: ['source'],
    enumProperties: { source: RATING_SOURCES },
  },
} as const satisfies EventSpecMap

export interface EngagementEventProps {
  // Fired when a local notification deep-links the app open — the per-type open rate.
  notification_opened: { type: NotificationType }
  // §3.15 About: layered trigger anchored to the unlock moment.
  rating_prompt_shown: { source: 'unlock_moment' | 'settings' }
}
