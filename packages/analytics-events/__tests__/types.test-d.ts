import { describe, expectTypeOf, it } from 'vitest'
import type {
  AdaptyEventName,
  AnalyticsEvent,
  ClientEventName,
  EventName,
  EventOwner,
  FlowScreen,
  OnboardingFunnelStep,
  OwnerOf,
  PropsOf,
  ServerEventName,
  TrackOnboardingAnswer,
  TrackOnboardingScreen,
} from '../index'

describe('PropsOf', () => {
  it('resolves per-event property shapes', () => {
    expectTypeOf<PropsOf<'paywall_viewed'>>().toEqualTypeOf<{
      placement: 'onboarding' | 'in_app'
      has_trial: boolean
      variation_id?: string
    }>()
    expectTypeOf<PropsOf<'purchase_started'>>().toEqualTypeOf<{
      placement: 'onboarding' | 'in_app'
      plan_id: string
    }>()
    expectTypeOf<PropsOf<'restore_started'>>().toEqualTypeOf<
      Record<string, never>
    >()
    expectTypeOf<PropsOf<'paywall_error'>>().toEqualTypeOf<{
      operation: 'load' | 'purchase' | 'restore'
    }>()
    expectTypeOf<PropsOf<'purchase_failed'>>().toEqualTypeOf<{
      reason_class: 'cancelled' | 'declined' | 'network' | 'unavailable' | 'unknown'
    }>()
    expectTypeOf<PropsOf<'onboarding_screen_viewed'>>().toEqualTypeOf<{
      screen: FlowScreen
    }>()
    expectTypeOf<PropsOf<'milestone_unlocked'>>().toEqualTypeOf<
      Record<string, never>
    >()
  })

  it('D12: every props shape is flat string/number/boolean values only', () => {
    expectTypeOf<PropsOf<EventName>>().toExtend<
      Record<string, string | number | boolean | undefined>
    >()
  })
})

describe('OwnerOf', () => {
  it('resolves literal owners', () => {
    expectTypeOf<OwnerOf<'earn_claimed'>>().toEqualTypeOf<'client'>()
    expectTypeOf<OwnerOf<'support_request_submitted'>>().toEqualTypeOf<'server'>()
    expectTypeOf<OwnerOf<'trial_started'>>().toEqualTypeOf<'adapty'>()
  })

  it('every event has an owner from the closed set', () => {
    expectTypeOf<OwnerOf<EventName>>().toEqualTypeOf<EventOwner>()
  })
})

describe('owner-filtered name unions', () => {
  it('partition EventName', () => {
    expectTypeOf<
      ClientEventName | ServerEventName | AdaptyEventName
    >().toEqualTypeOf<EventName>()
    expectTypeOf<ClientEventName & ServerEventName>().toBeNever()
    expectTypeOf<ClientEventName & AdaptyEventName>().toBeNever()
    expectTypeOf<ServerEventName & AdaptyEventName>().toBeNever()
  })

  it('place anchor events on the right side', () => {
    expectTypeOf<'paywall_viewed'>().toExtend<ClientEventName>()
    expectTypeOf<'vendor_connected'>().toExtend<ServerEventName>()
    expectTypeOf<'subscription_renewed'>().toExtend<AdaptyEventName>()
  })
})

describe('AnalyticsEvent', () => {
  it('narrows props on the name discriminant', () => {
    const ev = {} as AnalyticsEvent
    if (ev.name === 'purchase_started') {
      expectTypeOf(ev.props).toEqualTypeOf<{
        placement: 'onboarding' | 'in_app'
        plan_id: string
      }>()
    }
  })
})

describe('FLOW funnel type surface (§10.5)', () => {
  it('the two helpers are typed against the FlowScreen union', () => {
    expectTypeOf<TrackOnboardingScreen>().toEqualTypeOf<(screen: FlowScreen) => void>()
    expectTypeOf<TrackOnboardingAnswer>().toEqualTypeOf<
      (screen: FlowScreen, value: string | number | boolean) => void
    >()
  })

  it('funnel steps are the two onboarding events, discriminated', () => {
    expectTypeOf<OnboardingFunnelStep['name']>().toEqualTypeOf<
      'onboarding_screen_viewed' | 'onboarding_answer'
    >()
    const step = {} as OnboardingFunnelStep
    if (step.name === 'onboarding_answer') {
      expectTypeOf(step.props).toEqualTypeOf<{ screen: FlowScreen }>()
    }
  })
})
