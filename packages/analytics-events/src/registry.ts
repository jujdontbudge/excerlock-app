import type { EventOwner, EventProps } from './types'
import { conditionEvents, type ConditionEventProps } from './events/conditions'
import { engagementEvents, type EngagementEventProps } from './events/engagement'
import { onboardingEvents, type OnboardingEventProps } from './events/onboarding'
import { paywallEvents, type PaywallEventProps } from './events/paywall'
import { identityEvents, type IdentityEventProps } from './events/identity'
import { shieldEvents, type ShieldEventProps } from './events/shield'
import { subscriptionEvents, type SubscriptionEventProps } from './events/subscription'
import { supportEvents, type SupportEventProps } from './events/support'
import { vendorEvents, type VendorEventProps } from './events/vendors'
import { runtimeEvents, type RuntimeEventProps } from './events/runtime'

export const EVENTS = {
  ...onboardingEvents,
  ...conditionEvents,
  ...shieldEvents,
  ...paywallEvents,
  ...identityEvents,
  ...engagementEvents,
  ...supportEvents,
  ...vendorEvents,
  ...subscriptionEvents,
  ...runtimeEvents,
} as const

export type EventRegistry = typeof EVENTS

export type EventName = keyof EventRegistry

type EventPropsMap = OnboardingEventProps &
  ConditionEventProps &
  ShieldEventProps &
  PaywallEventProps &
  IdentityEventProps &
  EngagementEventProps &
  SupportEventProps &
  VendorEventProps &
  SubscriptionEventProps &
  RuntimeEventProps

export type PropsOf<E extends EventName> = EventPropsMap[E]

export type OwnerOf<E extends EventName> = EventRegistry[E]['owner']

type EventNameOwnedBy<O extends EventOwner> = {
  [E in EventName]: OwnerOf<E> extends O ? E : never
}[EventName]

export type ClientEventName = EventNameOwnedBy<'client'>
export type ServerEventName = EventNameOwnedBy<'server'>
export type AdaptyEventName = EventNameOwnedBy<'adapty'>

export type AnalyticsEvent = {
  [E in EventName]: { name: E; props: PropsOf<E> }
}[EventName]

type Assert<T extends true> = T
type Same<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false

type _PropsCoverRegistry = Assert<Same<EventName, keyof EventPropsMap>>
type IllegalPropsEvents = {
  [E in EventName]: PropsOf<E> extends EventProps ? never : E
}[EventName]
type _PropsArePrimitiveOnly = Assert<Same<IllegalPropsEvents, never>>
