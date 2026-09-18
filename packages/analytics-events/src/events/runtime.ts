import type { EmptyProps, EventSpecMap } from '../types'
import type { EnforcementAppState, EnforcementSource } from './shield'

/** The two unlock surfaces (PRD §3.9 gym check-in, §3.8 propped walking). */
export type UnlockKind = 'gym' | 'treadmill'

/** Why a treadmill scan ended without a verified stance (§3.8). */
export type TreadmillScanFailure = 'denied' | 'timeout'

/**
 * Permissions, unlock surfaces and walking preferences — client-owned: the
 * whole economy evaluates on-device (PRD §5), so the client is the
 * authoritative emitter.
 *
 * The `gym_unlock_*` events also carry a location-derived `distance` metric at
 * their call sites; D12 keeps it off the transmission allowlist here, so the
 * boundary never sends it once the client emitter consumes
 * `transmittedPropertiesOf()` (follow-up, not this change).
 */
export const runtimeEvents = {
  permission_resolved: { owner: 'client', transmittedProperties: ['permission', 'outcome'] },
  unlock_completed: { owner: 'client', transmittedProperties: ['method', 'app_state', 'source'] },
  review_preset_selected: { owner: 'client', transmittedProperties: ['preset'] },
  walk_places_updated: { owner: 'client', transmittedProperties: ['walk_places'] },
  gym_presence_auto_started: { owner: 'client', transmittedProperties: [] },
  gym_presence_auto_confirmed: { owner: 'client', transmittedProperties: [] },
  gym_presence_ended: { owner: 'client', transmittedProperties: [] },
  gym_unlock_checked: { owner: 'client', transmittedProperties: ['preview'] },
  gym_unlock_tapped: { owner: 'client', transmittedProperties: ['preview'] },
  gym_unlock_confirmed: { owner: 'client', transmittedProperties: ['preview'] },
  gym_unlock_lost: { owner: 'client', transmittedProperties: [] },
  unlock_screen_opened: { owner: 'client', transmittedProperties: ['kind', 'preview'] },
  unlock_ceremony_done: { owner: 'client', transmittedProperties: ['kind', 'preview'] },
  treadmill_scan_started: { owner: 'client', transmittedProperties: ['preview'] },
  treadmill_scan_verified: { owner: 'client', transmittedProperties: ['ms', 'preview'] },
  treadmill_scan_failed: { owner: 'client', transmittedProperties: ['reason'] },
} as const satisfies EventSpecMap

export interface RuntimeEventProps {
  permission_resolved: { permission: 'motion' | 'screen_time' | 'notifications' | 'camera' | 'location'; outcome: 'granted' | 'denied' }
  // Emitted by the enforcement host when a shield gives way to live relief, so
  // app_state/source prove whether the unlock happened with ExcerLock closed.
  unlock_completed: { method: 'walking' | 'propped' | 'gym'; app_state: EnforcementAppState; source: EnforcementSource }
  review_preset_selected: { preset: 'keep' | 'adjust' | 'disable' }
  walk_places_updated: { walk_places: 'outside' | 'treadmill' | 'outside_and_treadmill' | 'none' }
  gym_presence_auto_started: EmptyProps
  gym_presence_auto_confirmed: EmptyProps
  gym_presence_ended: EmptyProps
  // `distance` stays on-device (D12) — only the attempt itself is transmitted.
  gym_unlock_checked: { preview: boolean }
  gym_unlock_tapped: { preview: boolean }
  // The preview ceremony skips the store round trip; a real check-in has no target.
  gym_unlock_confirmed: { preview?: boolean }
  gym_unlock_lost: EmptyProps
  unlock_screen_opened: { kind: UnlockKind; preview: boolean }
  unlock_ceremony_done: { kind: UnlockKind; preview: boolean }
  treadmill_scan_started: { preview: boolean }
  treadmill_scan_verified: { ms: number; preview: boolean }
  treadmill_scan_failed: { reason: TreadmillScanFailure }
}
