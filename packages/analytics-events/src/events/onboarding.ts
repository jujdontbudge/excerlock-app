import type { EventSpecMap, PropValue } from '../types'
import type { FlowScreen } from '../flow'

export const onboardingEvents = {
  onboarding_offer_exposed: { owner: 'client', transmittedProperties: ['arm', 'source', 'intro_offer', 'variation_id'] },
  onboarding_screen_viewed: { owner: 'client', transmittedProperties: ['screen', 'scenario', 'place'] },
  onboarding_answer: { owner: 'client', transmittedProperties: ['screen'] },
} as const satisfies EventSpecMap

export interface OnboardingEventProps {
  onboarding_offer_exposed: { arm: 'a' | 'b'; source: 'adapty' | 'fallback'; intro_offer: 'available' | 'unavailable' | 'unknown'; variation_id?: string }
  onboarding_screen_viewed: {
    screen: FlowScreen | 'plan-demo' | 'research' | 'rating';
    scenario?: 'walk-state' | 'walk-steps' | 'walk-minutes' | 'gym-arrival' | 'gym-minutes';
    place?: 'outside' | 'treadmill';
  }
  onboarding_answer: { screen: FlowScreen }
}

export type OnboardingFunnelEventName = keyof OnboardingEventProps

export type OnboardingFunnelStep = {
  [E in OnboardingFunnelEventName]: { name: E; props: OnboardingEventProps[E] }
}[OnboardingFunnelEventName]

export type TrackOnboardingScreen = (screen: FlowScreen) => void

export type TrackOnboardingAnswer = (screen: FlowScreen, value: PropValue) => void
