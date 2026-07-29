/** Who is allowed to emit an event — exactly one side per event (D4/D5). */
export type EventOwner = 'client' | 'server' | 'adapty'

/** D12: property values are ids/enums/numbers/booleans only. Never free text. */
export type PropValue = string | number | boolean

/** Flat property bag — `undefined` marks an optional property, never a value we send. */
export type EventProps = Record<string, PropValue | undefined>

/** Props shape for events that carry no properties. */
export type EmptyProps = Record<string, never>

/** One registry entry — everything the single-emitter guardrail test needs. */
export interface EventSpec {
  readonly owner: EventOwner
}

/** Shape every domain event module must satisfy. */
export type EventSpecMap = Record<string, EventSpec>
