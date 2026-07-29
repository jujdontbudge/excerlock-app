import { describe, expect, it } from 'vitest'
import {
  extendWalkIncrement,
  isWalkWindowActive,
  planWalkIncrement,
  WALK_INCREMENT_MINUTES,
} from '../src/walk'

const MIN_MS = 60_000
const INCREMENT_MS = WALK_INCREMENT_MINUTES * MIN_MS

describe('walk & scroll increment windows', () => {
  it('the increment is app-fixed at 15 minutes (never user-set)', () => {
    expect(WALK_INCREMENT_MINUTES).toBe(15)
  })

  it('starting a session opens exactly one increment from now', () => {
    expect(planWalkIncrement(1_000_000)).toEqual({ startMs: 1_000_000, endMs: 1_000_000 + INCREMENT_MS })
  })

  it('re-verification extends the window to one increment from the re-verify moment', () => {
    const window = planWalkIncrement(0)
    const extended = extendWalkIncrement(window, 5 * MIN_MS)
    expect(extended).toEqual({ startMs: 0, endMs: 5 * MIN_MS + INCREMENT_MS })
  })

  it('never grants more than one increment beyond now, no matter how often it renews', () => {
    let window = planWalkIncrement(0)
    for (let now = MIN_MS; now <= 60 * MIN_MS; now += MIN_MS) {
      const next = extendWalkIncrement(window, now)
      if (next === null) break
      expect(next.endMs - now).toBe(INCREMENT_MS)
      window = next
    }
  })

  it('cannot resurrect a lapsed window — force-quit caps the exploit at one increment', () => {
    const window = planWalkIncrement(0)
    // App force-quit at minute 3; OS re-shields at minute 15; app returns at minute 20.
    expect(extendWalkIncrement(window, 20 * MIN_MS)).toBeNull()
    // A fresh, explicit start is the only way back in — again one increment.
    expect(planWalkIncrement(20 * MIN_MS).endMs).toBe(20 * MIN_MS + INCREMENT_MS)
  })

  it('the window is half-open: active until endMs, inactive at endMs', () => {
    const window = planWalkIncrement(0)
    expect(isWalkWindowActive(window, 0)).toBe(true)
    expect(isWalkWindowActive(window, INCREMENT_MS - 1)).toBe(true)
    expect(isWalkWindowActive(window, INCREMENT_MS)).toBe(false)
    expect(isWalkWindowActive(null, 0)).toBe(false)
  })
})
