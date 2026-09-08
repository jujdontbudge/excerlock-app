import type { EmptyProps, EventSpecMap } from '../types'

/** The shield-screen variants (PRD §3.15 non-tab surface 1). */
export type ShieldCause = 'balance_empty' | 'full_lock' | 'walking_session_ended' | 'lock_window'

/** Why shields came down (§3.3 kinds, §3.10 schedule). */
export type ShieldLiftReason =
  | 'rule_met'
  | 'state_active'
  | 'walking_session'
  | 'rest_day'
  | 'lock_window_ended'

/** Where a Walk & Scroll session was started from (§3.5b; Siri via App Intents). */
export type WalkingSessionSource = 'home' | 'shield' | 'siri'

/** How a Walk & Scroll session ended (§3.5b: cadence lapse vs user stop). */
export type WalkingSessionEndReason = 'lapsed' | 'stopped'

/**
 * Shield + Walk & Scroll events — client-owned: ShieldController is the only writer of OS shield
 * state (ARCHITECTURE §2) and the server never sees it. `shield_screen_opened` is the
 * "Open ExcerLock" deep link from the shield, cause carried as a nav param.
 */
export const shieldEvents = {
  shields_applied: { owner: 'client', transmittedProperties: [] },
  shields_lifted: { owner: 'client', transmittedProperties: [] },
  shield_screen_opened: { owner: 'client', transmittedProperties: [] },
  walking_session_started: { owner: 'client', transmittedProperties: [] },
  walking_session_ended: { owner: 'client', transmittedProperties: [] },
} as const satisfies EventSpecMap

export interface ShieldEventProps {
  shields_applied: EmptyProps
  shields_lifted: EmptyProps
  shield_screen_opened: EmptyProps
  walking_session_started: EmptyProps
  walking_session_ended: EmptyProps
}
