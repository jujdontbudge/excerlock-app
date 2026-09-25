import type { EmptyProps, EventSpecMap } from '../types'

export type ShieldCause = 'balance_empty' | 'full_lock' | 'walk_session_ended' | 'lock_window'

export type ShieldLiftReason =
  | 'earn'
  | 'state_active'
  | 'walk_session'
  | 'rest_day'
  | 'lock_window_ended'
  | 'sick_day_override'

export type EnforcementAppState = 'active' | 'background' | 'inactive' | 'unknown'

export type EnforcementSource = 'foreground' | 'background' | 'manual' | 'geofence'

export type ShieldsAppliedCause = 'window_start' | 'relock' | 'boot'

export type ShieldsLiftedReason =
  | 'walking'
  | 'propped'
  | 'gym'
  | 'earned'
  | 'window_end'
  | 'lapsed'
  | 'disabled'
  | 'deleting'

export type WalkSessionSource = 'home' | 'shield' | 'siri'

export type WalkSessionEndReason = 'lapsed' | 'stopped'

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
