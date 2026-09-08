import type { EventSpecMap, PropValue } from '../types'
import { FLOW_SCREENS, type FlowScreen } from '../flow'

/** The six permissions the setup rail can ask for (`app-next/src/domain/types.ts`). */
export type PermissionName =
  | 'screenTime'
  | 'motion'
  | 'location'
  | 'health'
  | 'camera'
  | 'notifications'

/** What the OS answered. Mirrors the domain's `PermissionStatus`. */
export type PermissionResult = 'granted' | 'denied' | 'restricted' | 'notDetermined'

/** The three sign-in methods (B18). */
export type SignInProvider = 'apple' | 'google' | 'email'

const PERMISSIONS = [
  'screenTime',
  'motion',
  'location',
  'health',
  'camera',
  'notifications',
] as const
const PERMISSION_RESULTS = ['granted', 'denied', 'restricted', 'notDetermined'] as const
const SIGN_IN_PROVIDERS = ['apple', 'google', 'email'] as const

/**
 * The two funnel events (PRD §10.5): fired only by the rail's central renderer via
 * `trackOnboardingScreen` / `trackOnboardingAnswer` — never per-screen. A screen added to the
 * flow is instrumented with zero new code.
 *
 * `setup_permission_result` and `sign_in_completed` are the two setup-rail outcomes the funnel
 * cannot infer from a screen view alone.
 */
export const onboardingEvents = {
  onboarding_screen_viewed: {
    owner: 'client',
    transmittedProperties: ['screen'],
    enumProperties: { screen: FLOW_SCREENS },
  },
  onboarding_answer: {
    owner: 'client',
    transmittedProperties: ['screen'],
    enumProperties: { screen: FLOW_SCREENS },
  },
  setup_permission_result: {
    owner: 'client',
    transmittedProperties: ['permission', 'result'],
    enumProperties: { permission: PERMISSIONS, result: PERMISSION_RESULTS },
  },
  sign_in_completed: {
    owner: 'client',
    transmittedProperties: ['provider'],
    enumProperties: { provider: SIGN_IN_PROVIDERS },
  },
} as const satisfies EventSpecMap

export interface OnboardingEventProps {
  onboarding_screen_viewed: { screen: FlowScreen }
  onboarding_answer: { screen: FlowScreen }
  setup_permission_result: { permission: PermissionName; result: PermissionResult }
  sign_in_completed: { provider: SignInProvider }
}

export type OnboardingFunnelEventName = 'onboarding_screen_viewed' | 'onboarding_answer'

/** One emitted funnel step, discriminated on the event name. */
export type OnboardingFunnelStep = {
  [E in OnboardingFunnelEventName]: { name: E; props: OnboardingEventProps[E] }
}[OnboardingFunnelEventName]

/** Signature of the rail's screen-view helper (fires `$screen` + `onboarding_screen_viewed`). */
export type TrackOnboardingScreen = (screen: FlowScreen) => void

/** Signature of the rail's answer helper; the value is consumed locally, never transmitted. */
export type TrackOnboardingAnswer = (screen: FlowScreen, value: PropValue) => void
