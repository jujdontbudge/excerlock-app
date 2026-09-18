import type { EmptyProps, EventSpecMap } from '../types'

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

/** iOS app state when the enforcement host wrote native shield policy. */
export type EnforcementAppState = 'active' | 'background' | 'inactive' | 'unknown'

/** Which wake ran the reconcile that moved the shields (DetectionWake source). */
export type EnforcementSource = 'foreground' | 'background' | 'manual' | 'geofence'

/** Why the host re-shielded: a lock window began, relief lapsed, or a fresh JS
 * context (cold start or headless relaunch) found the window already active. */
export type ShieldsAppliedCause = 'window_start' | 'relock' | 'boot'

/** Why the host unshielded: live relief, an earned day, or no active window. */
export type ShieldsLiftedReason =
  | 'walking'
  | 'propped'
  | 'gym'
  | 'earned'
  | 'window_end'
  | 'lapsed'
  | 'disabled'
  | 'deleting'

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
  shields_applied: { owner: 'client', transmittedProperties: ['app_state', 'source', 'cause'] },
  shields_lifted: { owner: 'client', transmittedProperties: ['app_state', 'source', 'reason'] },
  shield_screen_opened: { owner: 'client', transmittedProperties: [] },
  walk_session_started: { owner: 'client', transmittedProperties: [] },
  walk_session_ended: { owner: 'client', transmittedProperties: [] },
} as const satisfies EventSpecMap

export interface ShieldEventProps {
  shields_applied: { app_state: EnforcementAppState; source: EnforcementSource; cause: ShieldsAppliedCause }
  shields_lifted: { app_state: EnforcementAppState; source: EnforcementSource; reason: ShieldsLiftedReason }
  shield_screen_opened: EmptyProps
  walk_session_started: EmptyProps
  walk_session_ended: EmptyProps
}
