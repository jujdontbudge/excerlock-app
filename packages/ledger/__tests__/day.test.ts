import { describe, expect, it } from 'vitest'
import { DAY_MS, dayEndMs, dayIndexFor, dayStartMs } from '../src/day'

const MIN_MS = 60_000
/** Local wall-clock ms for day `d` at `h`:`m`. Day 0 starts at ms 0. */
const at = (d: number, h: number, m = 0) => d * DAY_MS + (h * 60 + m) * MIN_MS

describe('dayIndexFor', () => {
  it('splits days at midnight when the boundary offset is 0', () => {
    expect(dayIndexFor(at(3, 0, 0), 0)).toBe(3)
    expect(dayIndexFor(at(3, 23, 59), 0)).toBe(3)
    expect(dayIndexFor(at(4, 0, 0), 0)).toBe(4)
  })

  it('respects a user-set day boundary (4:00 AM)', () => {
    const boundary = 4 * 60
    expect(dayIndexFor(at(3, 3, 59), boundary)).toBe(2)
    expect(dayIndexFor(at(3, 4, 0), boundary)).toBe(3)
    expect(dayIndexFor(at(3, 23, 30), boundary)).toBe(3)
    expect(dayIndexFor(at(4, 1, 0), boundary)).toBe(3)
  })
})

describe('dayStartMs / dayEndMs', () => {
  it('inverts dayIndexFor at the boundary instant', () => {
    const boundary = 4 * 60
    expect(dayStartMs(3, boundary)).toBe(at(3, 4, 0))
    expect(dayIndexFor(dayStartMs(3, boundary), boundary)).toBe(3)
  })

  it('ends a day exactly where the next one starts', () => {
    expect(dayEndMs(3, 240)).toBe(dayStartMs(4, 240))
    expect(dayEndMs(0, 0)).toBe(DAY_MS)
  })
})
