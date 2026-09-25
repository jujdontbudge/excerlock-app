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
