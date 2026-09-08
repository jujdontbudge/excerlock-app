/**
 * The retired FLOW rail, kept compiling for the legacy `app/` workspace and nothing else.
 *
 * `app/` renders the seven-screen onboarding that shipped before the rebuild; `app-next` renders
 * the O01–O20 rail plus its branches, and `FLOW_SCREENS` in `./flow` is that one. A single union
 * cannot describe both rails honestly, so the retired ids live here instead of widening the
 * shipping union — nothing in `app-next`, `server` or `packages` may import this module.
 *
 * P2-T12's cutover deletes `app/`. Delete this file in the same commit.
 */
import type { OnboardingFunnelEventName } from './events/onboarding'
import type { EventName, PropsOf } from './registry'
import type { PropValue } from './types'

/** The pre-rebuild rail, in the order it was rendered and funnelled. */
export const LEGACY_FLOW_SCREENS = [
  'value-prop',
  'confession',
  'mirror',
  'permissions-primer',
  'pick-apps',
  'paywall',
  'sign-up',
] as const

export type LegacyFlowScreen = (typeof LEGACY_FLOW_SCREENS)[number]

export function isLegacyFlowScreen(value: string): value is LegacyFlowScreen {
  return (LEGACY_FLOW_SCREENS as readonly string[]).includes(value)
}

/**
 * `PropsOf` with the two funnel events put back on the retired rail. Every other event keeps its
 * current shape, so the legacy kit still fails to compile on a cut event or a wrong payload.
 */
export type LegacyPropsOf<E extends EventName> = E extends OnboardingFunnelEventName
  ? { screen: LegacyFlowScreen }
  : PropsOf<E>

/** Signature of the retired rail's screen-view helper. */
export type LegacyTrackOnboardingScreen = (screen: LegacyFlowScreen) => void

/** Signature of the retired rail's answer helper; the value is consumed locally, never sent. */
export type LegacyTrackOnboardingAnswer = (screen: LegacyFlowScreen, value: PropValue) => void
