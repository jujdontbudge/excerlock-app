import { describe, expect, it } from 'vitest'
import { remainingMinutes } from '../src/balance'
import { DAY_MS } from '../src/day'
import { appendEntries, emptyJournal } from '../src/journal'
import {
  daySummaries,
  RATE_STREAK_FLOOR_MINUTES,
  STATE_STREAK_FLOOR_MINUTES,
} from '../src/summary'
import type { JournalEntry, LedgerConfig } from '../src/types'

const MIN_MS = 60_000
const at = (d: number, h: number, m = 0) => d * DAY_MS + (h * 60 + m) * MIN_MS

const config: LedgerConfig = {
  dayBoundaryOffsetMinutes: 0,
  baseAllowanceMinutes: 60,
  rollover: { capMinutes: 30 },
}

let seq = 0
const drain = (atMs: number, minutes = 1): JournalEntry => ({
  kind: 'drainTick',
  source: 'screentime',
  id: `t${seq++}`,
  atMs,
  minutes,
})
const event = (atMs: number, conditionId: string): JournalEntry => ({
  kind: 'earn',
  source: 'health',
  id: `e${seq++}`,
  atMs,
  conditionId,
  payout: { type: 'fixedChunk', minutes: 20 },
})
const rate = (atMs: number, conditionId: string, minutes: number): JournalEntry => ({
  kind: 'rateCredit',
  source: 'health',
  id: `r${seq++}`,
  atMs,
  conditionId,
  minutes,
})
const sustained = (atMs: number, conditionId: string, minutes: number): JournalEntry => ({
  kind: 'stateSustained',
  source: 'motion',
  id: `s${seq++}`,
  atMs,
  conditionId,
  minutes,
})

const journalOf = (entries: JournalEntry[]) => appendEntries(emptyJournal(), entries).journal

describe('daySummaries', () => {
  it('produces one record per day with earned / spent / usage / balances', () => {
    const summaries = daySummaries(
      journalOf([event(at(0, 8), 'run'), drain(at(0, 9), 10), drain(at(1, 9), 5)]),
      config,
      at(1, 12),
    )
    expect(summaries).toHaveLength(2)
    expect(summaries[0]).toMatchObject({
      dayIndex: 0,
      earnedMinutes: 20,
      spentMinutes: 10,
      usageMinutes: 10,
      startBalance: 60,
      endBalance: 70,
      rolloverIn: 0,
    })
    expect(summaries[1]).toMatchObject({ dayIndex: 1, rolloverIn: 30, startBalance: 90, endBalance: 85 })
  })

  it('attributes banked minutes to the condition that produced them', () => {
    const [day] = daySummaries(
      journalOf([
        event(at(0, 8), 'gym-arrive'),
        rate(at(0, 9), 'steps', 12.5),
        sustained(at(0, 10), 'walking', 20),
      ]),
      config,
      at(0, 23),
    )

    expect({
      gym: day!.conditions['gym-arrive']!.earnedMinutes,
      steps: day!.conditions.steps!.earnedMinutes,
      walking: day!.conditions.walking!.earnedMinutes,
      day: day!.earnedMinutes,
    }).toEqual({ gym: 20, steps: 12.5, walking: 0, day: 32.5 })
  })

  it('attributes only the rate correction that survives the zero clamp', () => {
    const fullLock = { ...config, baseAllowanceMinutes: 0, rollover: null }
    const [day] = daySummaries(
      journalOf([
        rate(at(0, 8), 'steps', 10),
        drain(at(0, 9), 8),
        rate(at(0, 10), 'steps', -5),
      ]),
      fullLock,
      at(0, 23),
    )

    expect({
      rate: day!.conditions.steps!.rateMinutes,
      attributed: day!.conditions.steps!.earnedMinutes,
      earned: day!.earnedMinutes,
      spent: day!.spentMinutes,
      balance: day!.endBalance,
    }).toEqual({ rate: 8, attributed: 8, earned: 8, spent: 8, balance: 0 })
  })

  it('keeps records for every day since the first entry — gap days included (#14: kept indefinitely)', () => {
    const summaries = daySummaries(journalOf([drain(at(0, 9))]), config, at(4, 12))
    expect(summaries.map((s) => s.dayIndex)).toEqual([0, 1, 2, 3, 4])
  })

  it('an event firing makes the condition (and day) meaningful', () => {
    const [day] = daySummaries(journalOf([event(at(0, 8), 'gym-arrive')]), config, at(0, 23))
    expect(day!.conditions['gym-arrive']!.meaningfulActivity).toBe(true)
    expect(day!.meaningfulActivity).toBe(true)
  })

  it('records the first qualifying event outcome, not the first journal entry or latest firing', () => {
    const [day] = daySummaries(
      journalOf([
        drain(at(0, 7)),
        event(at(0, 8), 'gym-arrive'),
        event(at(0, 9), 'gym-arrive'),
      ]),
      config,
      at(0, 23),
    )

    expect(day!.conditions['gym-arrive']!.firstQualifiedAtMs).toBe(at(0, 8))
  })

  it('rate credits qualify only at the app-fixed 15-minute floor', () => {
    expect(RATE_STREAK_FLOOR_MINUTES).toBe(15)
    const below = daySummaries(journalOf([rate(at(0, 8), 'steps', 14.9)]), config, at(0, 23))[0]!
    const atFloor = daySummaries(journalOf([rate(at(0, 8), 'steps', 7), rate(at(0, 9), 'steps', 8)]), config, at(0, 23))[0]!
    expect(below.conditions['steps']!.meaningfulActivity).toBe(false)
    expect(below.meaningfulActivity).toBe(false)
    expect(atFloor.conditions['steps']!.meaningfulActivity).toBe(true)
  })

  it('keeps the first rate-floor crossing after a correction and requalification', () => {
    const [day] = daySummaries(
      journalOf([
        rate(at(0, 8), 'steps', 8),
        rate(at(0, 9), 'steps', 7),
        rate(at(0, 10), 'steps', -10),
        rate(at(0, 11), 'steps', 10),
      ]),
      config,
      at(0, 23),
    )

    expect(day!.conditions.steps).toMatchObject({
      rateMinutes: 15,
      firstQualifiedAtMs: at(0, 9),
      meaningfulActivity: true,
    })
  })

  it('sustained states qualify only at the app-fixed 10-minute floor', () => {
    expect(STATE_STREAK_FLOOR_MINUTES).toBe(10)
    const below = daySummaries(journalOf([sustained(at(0, 8), 'walking', 9)]), config, at(0, 23))[0]!
    const atFloor = daySummaries(journalOf([sustained(at(0, 8), 'walking', 4), sustained(at(0, 9), 'walking', 6)]), config, at(0, 23))[0]!
    expect(below.meaningfulActivity).toBe(false)
    expect(atFloor.conditions['walking']!.meaningfulActivity).toBe(true)
  })

  it('counts a condition once per day regardless of how many times it fires (activity definition §3.13)', () => {
    const [day] = daySummaries(
      journalOf([event(at(0, 8), 'gym-arrive'), event(at(0, 18), 'gym-arrive'), event(at(0, 12), 'run')]),
      config,
      at(0, 23),
    )
    expect(day!.meaningfulConditionCount).toBe(2) // gym-arrive once + run once
  })
})

describe('remainingMinutes', () => {
  it('answers the balance as of a moment', () => {
    const journal = journalOf([drain(at(0, 9), 10), drain(at(0, 14), 5)])
    expect(remainingMinutes(journal, config, at(0, 10))).toBe(50)
    expect(remainingMinutes(journal, config, at(0, 15))).toBe(45)
    expect(remainingMinutes(journal, config, at(1, 0))).toBe(90) // next day: base + capped rollover
  })
})
