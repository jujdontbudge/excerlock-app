import { describe, expect, it } from 'vitest'
import { FLOW_SCREENS, isFlowScreen } from '../index'

// PRD §3.15 surface 3 — FLOW array locked 2026-07-28, sign-up on the rail after the paywall.
const LOCKED_V1_FLOW = [
  'value-prop',
  'confession',
  'mirror',
  'permissions-primer',
  'pick-apps',
  'paywall',
  'sign-up',
]

describe('FLOW_SCREENS', () => {
  it('matches the locked v1 flow, in order', () => {
    expect([...FLOW_SCREENS]).toEqual(LOCKED_V1_FLOW)
  })

  it('screen slugs are kebab-case', () => {
    for (const screen of FLOW_SCREENS) {
      expect(screen).toMatch(/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/)
    }
  })

  it('has no duplicate screens', () => {
    expect(new Set(FLOW_SCREENS).size).toBe(FLOW_SCREENS.length)
  })
})

describe('isFlowScreen', () => {
  it('accepts every screen in the flow', () => {
    for (const screen of FLOW_SCREENS) expect(isFlowScreen(screen)).toBe(true)
  })

  it('rejects unknown slugs', () => {
    expect(isFlowScreen('home')).toBe(false)
    expect(isFlowScreen('value_prop')).toBe(false)
    expect(isFlowScreen('')).toBe(false)
  })
})
