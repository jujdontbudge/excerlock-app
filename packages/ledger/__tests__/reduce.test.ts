import { describe, expect, it } from 'vitest'
import { DAY_MS } from '../src/day'
import { appendEntries, emptyJournal } from '../src/journal'
import { reduceLedger } from '../src/reduce'
import type { Journal, JournalEntry, LedgerConfig, Payout } from '../src/types'
import { UNLIMITED } from '../src/types'

const MIN_MS = 60_000
const at = (d: number, h: number, m = 0) => d * DAY_MS + (h * 60 + m) * MIN_MS

const config = (overrides: Partial<LedgerConfig> = {}): LedgerConfig => ({
  dayBoundaryOffsetMinutes: 0,
  baseAllowanceMinutes: 60,
  rollover: null,
  ...overrides,
})

const journalOf = (entries: JournalEntry[]): Journal => appendEntries(emptyJournal(), entries).journal

let seq = 0
const earn = (atMs: number, payout: Payout): JournalEntry => ({
  kind: 'earn',
  source: 'health',
  id: `e${seq++}`,
  atMs,
  conditionId: 'cond-run',
  payout,
})
const rate = (atMs: number, minutes: number): JournalEntry => ({
  kind: 'rateCredit',
  source: 'health',
  id: `r${seq++}`,
  atMs,
  conditionId: 'cond-steps',
  minutes,
})
const drain = (atMs: number, minutes = 1): JournalEntry => ({
  kind: 'drainTick',
  source: 'screentime',
  id: `t${seq++}`,
  atMs,
  minutes,
})

const today = (journal: Journal, cfg: LedgerConfig, throughMs: number) => {
  const days = reduceLedger(journal, cfg, throughMs)
  return days[days.length - 1]!
}

describe('reduceLedger — balance basics', () => {
  it('starts each day at the base allowance', () => {
    const day = today(journalOf([]), config(), at(0, 12))
    expect(day.startBalance).toBe(60)
    expect(day.balance).toBe(60)
  })

  it('drains ticks from the balance and records spend + usage', () => {
    const day = today(journalOf([drain(at(0, 9)), drain(at(0, 9, 1)), drain(at(0, 9, 2))]), config(), at(0, 12))
    expect(day.balance).toBe(57)
    expect(day.spentMinutes).toBe(3)
    expect(day.usageMinutes).toBe(3)
  })

  it('credits fixed-chunk earns and rate credits into the shared balance', () => {
    const day = today(
      journalOf([earn(at(0, 8), { type: 'fixedChunk', minutes: 30 }), rate(at(0, 9), 12.5)]),
      config(),
      at(0, 12),
    )
    expect(day.balance).toBe(102.5)
    expect(day.earnedMinutes).toBe(42.5)
  })

  it('clamps at zero: a tick never takes more than what is left', () => {
    const day = today(
      journalOf([drain(at(0, 9), 1)]),
      config({ baseAllowanceMinutes: 0.4 }),
      at(0, 12),
    )
    expect(day.balance).toBe(0)
    expect(day.spentMinutes).toBe(0.4)
    expect(day.usageMinutes).toBe(1)
  })

  it('Full Lock is just allowance = 0: empty until the first earn', () => {
    const cfg = config({ baseAllowanceMinutes: 0 })
    expect(today(journalOf([]), cfg, at(0, 10)).balance).toBe(0)
    const day = today(journalOf([earn(at(0, 11), { type: 'fixedChunk', minutes: 20 })]), cfg, at(0, 12))
    expect(day.balance).toBe(20)
  })

  it('an unset (unlimited) allowance never runs out', () => {
    const day = today(journalOf([drain(at(0, 9), 500)]), config({ baseAllowanceMinutes: UNLIMITED }), at(0, 12))
    expect(day.balance).toBe(UNLIMITED)
    expect(day.usageMinutes).toBe(500)
  })

  it('only evaluates entries up to throughMs (time-sliced view)', () => {
    const journal = journalOf([drain(at(0, 9)), drain(at(0, 15))])
    expect(today(journal, config(), at(0, 12)).balance).toBe(59)
    expect(today(journal, config(), at(0, 16)).balance).toBe(58)
  })

  it('is order-independent: append order never changes the reduced state', () => {
    const a = journalOf([drain(at(0, 9)), earn(at(0, 8), { type: 'fixedChunk', minutes: 10 })])
    const b = journalOf([earn(at(0, 8), { type: 'fixedChunk', minutes: 10 }), drain(at(0, 9))])
    expect(today(a, config(), at(0, 12)).balance).toBe(today(b, config(), at(0, 12)).balance)
  })

  it('at the same instant an earn lands before a drain (user is never shorted)', () => {
    const t = at(0, 9)
    const day = today(
      journalOf([drain(t, 1), earn(t, { type: 'fixedChunk', minutes: 5 })]),
      config({ baseAllowanceMinutes: 0 }),
      at(0, 12),
    )
    expect(day.balance).toBe(4)
    expect(day.spentMinutes).toBe(1)
  })
})

describe('reduceLedger — shield holidays (rest-of-day / set-period payouts)', () => {
  it('rest-of-day opens a holiday until the day boundary and banks no minutes', () => {
    const day = today(journalOf([earn(at(0, 10), { type: 'restOfDay' })]), config(), at(0, 12))
    expect(day.holidays).toEqual([{ startMs: at(0, 10), endMs: at(1, 0) }])
    expect(day.earnedMinutes).toBe(0)
    expect(day.balance).toBe(60)
  })

  it('set-period opens a bounded holiday, clamped to the day end', () => {
    const day = today(
      journalOf([
        earn(at(0, 10), { type: 'setPeriod', minutes: 30 }),
        earn(at(0, 23, 45), { type: 'setPeriod', minutes: 60 }),
      ]),
      config(),
      at(0, 23, 50),
    )
    expect(day.holidays).toEqual([
      { startMs: at(0, 10), endMs: at(0, 10, 30) },
      { startMs: at(0, 23, 45), endMs: at(1, 0) },
    ])
  })

  it('usage during a holiday counts as usage but never drains the balance', () => {
    const day = today(
      journalOf([earn(at(0, 10), { type: 'setPeriod', minutes: 30 }), drain(at(0, 10, 5)), drain(at(0, 11))]),
      config(),
      at(0, 12),
    )
    expect(day.balance).toBe(59) // only the 11:00 tick drains
    expect(day.spentMinutes).toBe(1)
    expect(day.usageMinutes).toBe(2)
  })
})

describe('reduceLedger — day boundaries', () => {
  it('resets the balance at the user-set boundary, not midnight', () => {
    const cfg = config({ dayBoundaryOffsetMinutes: 4 * 60 })
    const journal = journalOf([drain(at(1, 1), 10)]) // 1:00 AM — still ledger-day 0
    const days = reduceLedger(journal, cfg, at(1, 5))
    expect(days).toHaveLength(2)
    expect(days[0]!.balance).toBe(50)
    expect(days[1]!.balance).toBe(60)
  })

  it('synthesizes empty gap days so every day has a record', () => {
    const journal = journalOf([drain(at(0, 9))])
    const days = reduceLedger(journal, config(), at(3, 12))
    expect(days.map((d) => d.dayIndex)).toEqual([0, 1, 2, 3])
    expect(days[1]!.usageMinutes).toBe(0)
  })
})
