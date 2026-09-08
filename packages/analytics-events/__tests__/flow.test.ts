import { describe, expect, it } from 'vitest'
import {
  APP_SCREENS,
  FLOW_SCREENS,
  isFlowScreen,
  isTrackedScreen,
  TRACKED_SCREENS,
} from '../index'

// The rebuilt rail: questionnaire, activity branch, summary/schedule tail, paywall, setup.
// Mirrors `app-next/src/onboarding/flow.ts` + `setupFlow.ts`, in path order.
const LOCKED_V1_FLOW = [
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
  'G1',
  'G2',
  'R1',
  'R2',
  'B1',
  'B2',
  'D',
  'W1',
  'W2',
  'W3',
  'W4',
  'S1',
  'S2',
  'S3',
  'S4',
  'T1',
  'T2',
  'T3',
  'T4',
  'P',
  'X1',
  'X2',
  'X3a',
  'X3b',
  'X4',
  'X5',
]

describe('FLOW_SCREENS', () => {
  it('matches the rebuilt rail, in path order', () => {
    expect([...FLOW_SCREENS]).toEqual(LOCKED_V1_FLOW)
  })

  it('screen ids are the app step ids — a letter, digits, an optional branch suffix', () => {
    for (const screen of FLOW_SCREENS) {
      expect(screen).toMatch(/^[A-Z][0-9]*[a-z]?$/)
    }
  })

  it('has no duplicate screens', () => {
    expect(new Set(FLOW_SCREENS).size).toBe(FLOW_SCREENS.length)
  })

  it('ends on the setup rail, so the funnel reads through to the finished plan', () => {
    expect(FLOW_SCREENS[FLOW_SCREENS.length - 1]).toBe('X5')
    expect(FLOW_SCREENS.indexOf('P')).toBeLessThan(FLOW_SCREENS.indexOf('X1'))
  })
})

describe('isFlowScreen', () => {
  it('accepts every screen in the flow', () => {
    for (const screen of FLOW_SCREENS) expect(isFlowScreen(screen)).toBe(true)
  })

  it('rejects the retired kebab slugs and anything unknown', () => {
    expect(isFlowScreen('value-prop')).toBe(false)
    expect(isFlowScreen('pick-apps')).toBe(false)
    expect(isFlowScreen('o01')).toBe(false)
    expect(isFlowScreen('')).toBe(false)
  })

  it('rejects a steady-state screen — those are not funnel steps', () => {
    expect(isFlowScreen('Home')).toBe(false)
  })
})

describe('TRACKED_SCREENS', () => {
  it('is the flow rail plus the steady-state screens, with no duplicates', () => {
    expect([...TRACKED_SCREENS]).toEqual([...FLOW_SCREENS, ...APP_SCREENS])
    expect(new Set(TRACKED_SCREENS).size).toBe(TRACKED_SCREENS.length)
  })

  it('accepts every flow and app screen, and nothing else', () => {
    for (const screen of TRACKED_SCREENS) expect(isTrackedScreen(screen)).toBe(true)
    expect(isTrackedScreen('Home')).toBe(true)
    expect(isTrackedScreen('Settings')).toBe(false)
    expect(isTrackedScreen('/(tabs)/home')).toBe(false)
  })
})
