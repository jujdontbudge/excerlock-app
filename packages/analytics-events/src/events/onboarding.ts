import type { EventSpecMap, PropValue } from '../types'
import type { FlowScreen } from '../flow'

/**
 * The two funnel events (PRD §10.5): fired only by the FLOW rail's central
 * renderer via `trackOnboardingScreen` / `trackOnboardingAnswer` — never
 * per-screen. A screen added to the FLOW array is instrumented with zero
 * new code.
 */
export const onboardingEvents = {
  onboarding_screen_viewed: { owner: 'client', transmittedProperties: ['screen', 'scenario', 'place'] },
  onboarding_answer: { owner: 'client', transmittedProperties: ['screen'] },
} as const satisfies EventSpecMap

export interface OnboardingEventProps {
  onboarding_screen_viewed: {
    screen: FlowScreen | 'plan-demo';
    scenario?: 'walk-state' | 'walk-steps' | 'walk-minutes' | 'gym-arrival' | 'gym-minutes';
    place?: 'outside' | 'treadmill';
  }
  onboarding_answer: { screen: FlowScreen }
}

export type OnboardingFunnelEventName = keyof OnboardingEventProps

/** One emitted funnel step, discriminated on the event name. */
export type OnboardingFunnelStep = {
  [E in OnboardingFunnelEventName]: { name: E; props: OnboardingEventProps[E] }
}[OnboardingFunnelEventName]

/** Signature of the rail's screen-view helper (fires `$screen` + `onboarding_screen_viewed`). */
export type TrackOnboardingScreen = (screen: FlowScreen) => void

/** Signature of the rail's answer helper; the value is consumed locally, never transmitted. */
export type TrackOnboardingAnswer = (screen: FlowScreen, value: PropValue) => void
