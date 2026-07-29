import { describe, expect, it } from 'vitest'
import { DAY_MS } from '../src/day'
import { appendEntries, emptyJournal } from '../src/journal'
import { reduceLedger } from '../src/reduce'
import type { JournalEntry, LedgerConfig } from '../src/types'
import { UNLIMITED } from '../src/types'

const MIN_MS = 60_000
const at = (d: number, h: number, m = 0) => d * DAY_MS + (h * 60 + m) * MIN_MS

const config = (overrides: Partial<LedgerConfig> = {}): LedgerConfig => ({
  dayBoundaryOffsetMinutes: 0,
  baseAllowanceMinutes: 60,
  rollover: { capMinutes: 30 },
  ...overrides,
})

let seq = 0
const drain = (atMs: number, minutes: number): JournalEntry => ({
  kind: 'drainTick',
  source: 'screentime',
  id: `t${seq++}`,
  atMs,
  minutes,
})
const chunk = (atMs: number, minutes: number): JournalEntry => ({
  kind: 'earn',
  source: 'health',
  id: `e${seq++}`,
  atMs,
  conditionId: 'cond-run',
  payout: { type: 'fixedChunk', minutes },
})

const reduce = (entries: JournalEntry[], cfg: LedgerConfig, throughMs: number) =>
  reduceLedger(appendEntries(emptyJournal(), entries).journal, cfg, throughMs)

describe('rollover', () => {
  it('is off by default: leftover balance vanishes at the boundary', () => {
    const days = reduce([drain(at(0, 20), 10)], config({ rollover: null }), at(1, 12))
    expect(days[1]!.rolloverIn).toBe(0)
    expect(days[1]!.startBalance).toBe(60)
  })

  it('carries unspent balance up to the cap', () => {
    // Day 0 ends with 60 − 10 = 50 left; cap 30 → day 1 starts at 60 + 30.
    const days = reduce([drain(at(0, 20), 10)], config(), at(1, 12))
    expect(days[1]!.rolloverIn).toBe(30)
    expect(days[1]!.startBalance).toBe(90)
  })

  it('carries the full leftover when it is under the cap', () => {
    const days = reduce([drain(at(0, 20), 45)], config(), at(1, 12))
    expect(days[1]!.rolloverIn).toBe(15)
  })

  it('chains across an empty gap day, re-capped each boundary', () => {
    // Day 0 leaves 50 → day 1 starts 60+30, spends nothing → day 2 still gets only the cap.
    const days = reduce([drain(at(0, 20), 10)], config(), at(2, 12))
    expect(days[1]!.rolloverIn).toBe(30)
    expect(days[2]!.rolloverIn).toBe(30)
  })

  it('rolls over from an unlimited day as exactly the cap', () => {
    const days = reduce([drain(at(0, 20), 300)], config({ baseAllowanceMinutes: UNLIMITED }), at(1, 12))
    expect(days[1]!.rolloverIn).toBe(30)
  })

  it('gives Full Lock earned-but-unspent time a next-day head start', () => {
    const days = reduce([chunk(at(0, 18), 25)], config({ baseAllowanceMinutes: 0 }), at(1, 12))
    expect(days[1]!.startBalance).toBe(25)
  })

  it('applies at the user-set boundary: late-night spend still counts against yesterday', () => {
    const cfg = config({ dayBoundaryOffsetMinutes: 4 * 60 })
    // 1:30 AM on calendar day 1 is still ledger-day 0.
    const days = reduce([drain(at(1, 1, 30), 40)], cfg, at(1, 5))
    expect(days[0]!.balance).toBe(20)
    expect(days[1]!.rolloverIn).toBe(20)
    expect(days[1]!.startBalance).toBe(80)
  })
})
