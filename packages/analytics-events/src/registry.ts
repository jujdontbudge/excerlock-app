import type { EventOwner, EventProps } from './types'
import { conditionEvents, type ConditionEventProps } from './events/conditions'
import { engagementEvents, type EngagementEventProps } from './events/engagement'
import { onboardingEvents, type OnboardingEventProps } from './events/onboarding'
import { paywallEvents, type PaywallEventProps } from './events/paywall'
import { shieldEvents, type ShieldEventProps } from './events/shield'
import { subscriptionEvents, type SubscriptionEventProps } from './events/subscription'
import { supportEvents, type SupportEventProps } from './events/support'
import { vendorEvents, type VendorEventProps } from './events/vendors'

/**
 * The complete v1 event registry: every allowed PostHog event name with its
 * declared owner. This object is what the single-emitter guardrail test
 * (ARCHITECTURE §5 #6) walks against the codebase's capture call sites.
 */
export const EVENTS = {
  ...onboardingEvents,
  ...conditionEvents,
  ...shieldEvents,
  ...paywallEvents,
  ...engagementEvents,
  ...supportEvents,
  ...vendorEvents,
  ...subscriptionEvents,
} as const

export type EventRegistry = typeof EVENTS

/** The string-literal union of every allowed event name (D3). */
export type EventName = keyof EventRegistry

type EventPropsMap = OnboardingEventProps &
  ConditionEventProps &
  ShieldEventProps &
  PaywallEventProps &
  EngagementEventProps &
  SupportEventProps &
  VendorEventProps &
  SubscriptionEventProps

/** Properties type of one event. */
export type PropsOf<E extends EventName> = EventPropsMap[E]

/** Declared owner of one event, as a literal. */
export type OwnerOf<E extends EventName> = EventRegistry[E]['owner']

type EventNameOwnedBy<O extends EventOwner> = {
  [E in EventName]: OwnerOf<E> extends O ? E : never
}[EventName]

export type ClientEventName = EventNameOwnedBy<'client'>
export type ServerEventName = EventNameOwnedBy<'server'>
export type AdaptyEventName = EventNameOwnedBy<'adapty'>

/** One emitted event, discriminated on `name` — what a dev ring buffer holds. */
export type AnalyticsEvent = {
  [E in EventName]: { name: E; props: PropsOf<E> }
}[EventName]

// ---- Compile-time invariants (a violation fails `tsc` and the vitest typecheck) ----
type Assert<T extends true> = T
type Same<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false

// Every registered event has a props type, and vice versa.
type _PropsCoverRegistry = Assert<Same<EventName, keyof EventPropsMap>>
// D12: every props shape is a flat bag of string/number/boolean values.
type IllegalPropsEvents = {
  [E in EventName]: PropsOf<E> extends EventProps ? never : E
}[EventName]
type _PropsArePrimitiveOnly = Assert<Same<IllegalPropsEvents, never>>
