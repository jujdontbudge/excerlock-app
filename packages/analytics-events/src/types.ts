export type EventOwner = 'client' | 'server' | 'adapty'

export type PropValue = string | number | boolean

export type EventProps = Record<string, PropValue | undefined>

export type EmptyProps = Record<string, never>

export interface EventSpec {
  readonly owner: EventOwner
  readonly transmittedProperties?: readonly string[]
}

export type EventSpecMap = Record<string, EventSpec>
