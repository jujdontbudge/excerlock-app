/**
 * The FLOW onboarding rail's screen names (PRD §10.5, §3.15 surface 3).
 *
 * Order here is the locked v1 default and what the PostHog acquisition-funnel
 * insight steps through. The app's `flow.ts` array (app/src/onboarding) renders
 * richer per-screen data but is typed against this union — adding a screen
 * starts by adding its slug here.
 */
export const FLOW_SCREENS = [
  'value-prop',
  'confession',
  'mirror',
  'permissions-primer',
  'pick-apps',
  'paywall',
  'sign-up',
] as const

export type FlowScreen = (typeof FLOW_SCREENS)[number]

export function isFlowScreen(value: string): value is FlowScreen {
  return (FLOW_SCREENS as readonly string[]).includes(value)
}
