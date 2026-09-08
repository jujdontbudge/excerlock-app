import { EVENTS, type ClientEventName, type EventName } from './registry'
import type { EventOwner, EventSpec } from './types'

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

/** Canonical privacy allowlist for a client event's transport payload. */
export function transmittedPropertiesOf(name: ClientEventName): readonly string[] {
  const spec = EVENTS[name]
  return 'transmittedProperties' in spec ? spec.transmittedProperties : []
}

/**
 * The declared value floor for one transmitted property, or `undefined` when the property is not
 * an enum. The transport drops a declared-enum property carrying anything else (D12).
 */
export function enumValuesOf(
  name: ClientEventName,
  property: string,
): readonly string[] | undefined {
  const spec = EVENTS[name] as EventSpec
  return spec.enumProperties?.[property]
}

/** Narrowing guard for raw strings found while walking the codebase. */
export function isRegisteredEvent(name: string): name is EventName {
  return Object.prototype.hasOwnProperty.call(EVENTS, name)
}
