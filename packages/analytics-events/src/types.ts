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
  /** Client properties permitted to cross the analytics transport boundary. */
  readonly transmittedProperties?: readonly string[]
  /**
   * D12's value floor. A transmitted property listed here may only carry one of the declared
   * values; anything else is dropped at the boundary. Untyped call sites are the reason this
   * exists — a caught exception's `message` reaching a `reason` property would otherwise carry a
   * gym name, a path, or a bundle id into PostHog.
   */
  readonly enumProperties?: Readonly<Record<string, readonly string[]>>
}

/** Shape every domain event module must satisfy. */
export type EventSpecMap = Record<string, EventSpec>
