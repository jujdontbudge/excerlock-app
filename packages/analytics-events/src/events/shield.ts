import type { EventSpecMap } from '../types'

/** The four shield-screen variants (PRD §3.15 non-tab surface 1). */
export type ShieldCause = 'balance_empty' | 'full_lock' | 'walk_session_ended' | 'lock_window'

/** Why shields came down (§3.3 kinds, §3.10 schedule, §3.11 override). */
export type ShieldLiftReason =
  | 'earn'
  | 'state_active'
  | 'walk_session'
  | 'rest_day'
  | 'lock_window_ended'
  | 'sick_day_override'

/** Where a Walk & Scroll session was started from (§3.5b; Siri via App Intents). */
export type WalkSessionSource = 'home' | 'shield' | 'siri'

/** How a Walk & Scroll session ended (§3.5b: cadence lapse vs user stop). */
export type WalkSessionEndReason = 'lapsed' | 'stopped'

/**
 * Shield + Walk & Scroll events — client-owned: ShieldController is the only
 * writer of OS shield state (ARCHITECTURE §2) and the server never sees it.
 * `shield_screen_opened` is the "Open ExcerLock" deep link from the shield,
 * cause carried as a nav param (Regen's `panic_opened` pattern).
 */
export const shieldEvents = {
  shields_applied: { owner: 'client' },
  shields_lifted: { owner: 'client' },
  shield_screen_opened: { owner: 'client' },
  walk_session_started: { owner: 'client' },
  walk_session_ended: { owner: 'client' },
} as const satisfies EventSpecMap

export interface ShieldEventProps {
  shields_applied: { cause: ShieldCause }
  shields_lifted: { reason: ShieldLiftReason }
  shield_screen_opened: { cause: ShieldCause }
  walk_session_started: { source: WalkSessionSource }
  walk_session_ended: { reason: WalkSessionEndReason }
}
