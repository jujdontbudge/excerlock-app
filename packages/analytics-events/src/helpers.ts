import { EVENTS, type ClientEventName, type EventName } from './registry'
import type { EventOwner } from './types'

export const EVENT_NAMES = Object.keys(EVENTS).sort() as readonly EventName[]

export function ownerOf(name: EventName): EventOwner {
  return EVENTS[name].owner
}

export function eventsOwnedBy(owner: EventOwner): EventName[] {
  return EVENT_NAMES.filter((name) => EVENTS[name].owner === owner)
}

export function transmittedPropertiesOf(name: ClientEventName): readonly string[] {
  const spec = EVENTS[name]
  return 'transmittedProperties' in spec ? spec.transmittedProperties : []
}

export function isRegisteredEvent(name: string): name is EventName {
  return Object.prototype.hasOwnProperty.call(EVENTS, name)
}
