/**
 * Every screen name allowed as a `$screen` value (D11 — manual screen tracking only).
 *
 * `FLOW_SCREENS` is the acquisition rail: the onboarding questionnaire (`O01`–`O20`), the
 * activity branch it forks into, the summary/schedule tail (`S1`–`S4`, `T1`–`T4`), the paywall
 * (`P`), and the post-purchase setup rail (`X1`–`X5`). Order is path order — the longest path a
 * person can walk — and it is what the PostHog acquisition-funnel insight steps through.
 *
 * The app's `app-next/src/onboarding/flow.ts` and `setupFlow.ts` render the richer per-screen
 * data; adding a screen there starts by adding its id here, or its `$screen` is dropped at the
 * transport boundary.
 */
const ONBOARDING_SCREENS = [
  'O01',
  'O02',
  'O03',
  'O04',
  'O05',
  'O06',
  'O07',
  'O08',
  'O09',
  'O10',
  'O11',
  'O12',
  'O13',
  'O14',
  'O15',
  'O16',
  'O17',
  'O18',
  'O19',
  'O20',
] as const

/** The activity fork after `O20`. One of these sequences runs, never all of them. */
const BRANCH_SCREENS = ['G1', 'G2', 'R1', 'R2', 'B1', 'B2', 'D', 'W1', 'W2', 'W3', 'W4'] as const

/** Summary, schedule, and the paywall the rail ends on. */
const TAIL_SCREENS = ['S1', 'S2', 'S3', 'S4', 'T1', 'T2', 'T3', 'T4', 'P'] as const

/** The post-purchase setup rail. `X3a` is the gym picker, `X3b` the branch permission primer. */
const SETUP_SCREENS = ['X1', 'X2', 'X3a', 'X3b', 'X4', 'X5'] as const

export const FLOW_SCREENS = [
  ...ONBOARDING_SCREENS,
  ...BRANCH_SCREENS,
  ...TAIL_SCREENS,
  ...SETUP_SCREENS,
] as const

export type FlowScreen = (typeof FLOW_SCREENS)[number]

export function isFlowScreen(value: string): value is FlowScreen {
  return (FLOW_SCREENS as readonly string[]).includes(value)
}

/**
 * Screens outside the acquisition rail that still report a `$screen`. Kept separate so the funnel
 * insight can step `FLOW_SCREENS` without the app's steady-state surfaces landing in it.
 */
export const APP_SCREENS = ['Home'] as const

export type AppScreen = (typeof APP_SCREENS)[number]

/** Every legal `$screen` value. The transport drops anything else (D11/D12). */
export const TRACKED_SCREENS = [...FLOW_SCREENS, ...APP_SCREENS] as const

export type TrackedScreen = FlowScreen | AppScreen

export function isTrackedScreen(value: string): value is TrackedScreen {
  return (TRACKED_SCREENS as readonly string[]).includes(value)
}
