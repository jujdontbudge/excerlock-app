import type { EventSpecMap } from '../types'
export const runtimeEvents = {
  permission_resolved: { owner: 'client', transmittedProperties: ['permission', 'outcome'] },
  unlock_completed: { owner: 'client', transmittedProperties: ['method'] },
  review_preset_selected: { owner: 'client', transmittedProperties: ['preset'] },
  walk_places_updated: { owner: 'client', transmittedProperties: ['walk_places'] },
} as const satisfies EventSpecMap
export interface RuntimeEventProps {
  permission_resolved: { permission: 'motion' | 'screen_time' | 'notifications' | 'camera' | 'location'; outcome: 'granted' | 'denied' }
  unlock_completed: { method: 'walking' | 'propped' | 'gym' }
  review_preset_selected: { preset: 'keep' | 'adjust' | 'disable' }
  walk_places_updated: { walk_places: 'outside' | 'treadmill' | 'outside_and_treadmill' | 'none' }
}
