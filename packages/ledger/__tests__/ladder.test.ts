import { describe, expect, it } from 'vitest'
import { planDrainLadder } from '../src/ladder'
import { UNLIMITED } from '../src/types'

describe('planDrainLadder', () => {
  it('arms one rung per remaining minute, offset by minutes already used', () => {
    expect(planDrainLadder({ usedMinutes: 0, remainingMinutes: 5 })).toEqual([1, 2, 3, 4, 5])
  })

  it('re-arms mid-day from the current usage count (includesPastActivity semantics)', () => {
    expect(planDrainLadder({ usedMinutes: 37, remainingMinutes: 3 })).toEqual([38, 39, 40])
  })

  it('re-arms after ticks fire: planning again continues the ladder, never resets it', () => {
    const first = planDrainLadder({ usedMinutes: 10, remainingMinutes: 5 })
    const afterTwoTicks = planDrainLadder({ usedMinutes: 12, remainingMinutes: 3 })
    expect(afterTwoTicks).toEqual(first.slice(2))
  })

  it('ends the ladder exactly where the balance hits zero, even fractionally', () => {
    expect(planDrainLadder({ usedMinutes: 10, remainingMinutes: 2.5 })).toEqual([11, 12, 12.5])
    expect(planDrainLadder({ usedMinutes: 4, remainingMinutes: 0.5 })).toEqual([4.5])
  })

  it('arms nothing when the balance is empty or unlimited', () => {
    expect(planDrainLadder({ usedMinutes: 20, remainingMinutes: 0 })).toEqual([])
    expect(planDrainLadder({ usedMinutes: 20, remainingMinutes: UNLIMITED })).toEqual([])
  })

  it('treats a negative remainder defensively as empty', () => {
    expect(planDrainLadder({ usedMinutes: 20, remainingMinutes: -3 })).toEqual([])
  })

  it('truncates to maxRungs for OS threshold limits (re-arm continues the tail)', () => {
    expect(planDrainLadder({ usedMinutes: 0, remainingMinutes: 10, maxRungs: 3 })).toEqual([1, 2, 3])
  })
})
