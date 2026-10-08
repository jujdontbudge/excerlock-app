import type { EmptyProps, EventSpecMap } from '../types'
import type { EnforcementAppState, EnforcementSource } from './shield'

export type WalkPlaces =
  | 'outside' | 'inside' | 'treadmill'
  | 'outside_and_inside' | 'outside_and_treadmill' | 'inside_and_treadmill'
  | 'outside_and_inside_and_treadmill' | 'none'

export type UnlockKind = 'gym' | 'treadmill'

export type TreadmillScanFailure = 'denied' | 'timeout'

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
  unlock_completed: { method: 'walking' | 'propped' | 'gym'; app_state: EnforcementAppState; source: EnforcementSource }
  review_preset_selected: { preset: 'keep' | 'adjust' | 'disable' }
  walk_places_updated: { walk_places: WalkPlaces }
  gym_presence_auto_started: EmptyProps
  gym_presence_auto_confirmed: EmptyProps
  gym_presence_ended: EmptyProps
  gym_unlock_checked: { preview: boolean }
  gym_unlock_tapped: { preview: boolean }
  gym_unlock_confirmed: { preview?: boolean }
  gym_unlock_lost: EmptyProps
  unlock_screen_opened: { kind: UnlockKind; preview: boolean }
  unlock_ceremony_done: { kind: UnlockKind; preview: boolean }
  treadmill_scan_started: { preview: boolean }
  treadmill_scan_verified: { ms: number; preview: boolean }
  treadmill_scan_failed: { reason: TreadmillScanFailure }
}
