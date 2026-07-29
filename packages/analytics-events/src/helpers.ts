import { EVENTS, type EventName } from './registry'
import type { EventOwner } from './types'

/** Every registered event name, sorted — stable input for guardrail walks. */
export const EVENT_NAMES = Object.keys(EVENTS).sort() as readonly EventName[]

/** The declared owner of a registered event. */
export function ownerOf(name: EventName): EventOwner {
  return EVENTS[name].owner
}

/** All event names a given side is allowed to emit, sorted. */
export function eventsOwnedBy(owner: EventOwner): EventName[] {
  return EVENT_NAMES.filter((name) => EVENTS[name].owner === owner)
}

/** Narrowing guard for raw strings found while walking the codebase. */
export function isRegisteredEvent(name: string): name is EventName {
  return Object.prototype.hasOwnProperty.call(EVENTS, name)
}
