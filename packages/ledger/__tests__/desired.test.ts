import { describe, expect, it } from 'vitest'
import { DAY_MS } from '../src/day'
import { desiredOsState } from '../src/desired'
import { appendEntries, emptyJournal } from '../src/journal'
import type { JournalEntry, LedgerConfig, Payout } from '../src/types'
import { UNLIMITED } from '../src/types'
import { planWalkIncrement } from '../src/walk'

const MIN_MS = 60_000
const at = (d: number, h: number, m = 0) => d * DAY_MS + (h * 60 + m) * MIN_MS

const config = (overrides: Partial<LedgerConfig> = {}): LedgerConfig => ({
  dayBoundaryOffsetMinutes: 0,
  baseAllowanceMinutes: 60,
  rollover: null,
  ...overrides,
})

let seq = 0
const drain = (atMs: number, minutes = 1): JournalEntry => ({
  kind: 'drainTick',
  source: 'screentime',
  id: `t${seq++}`,
  atMs,
  minutes,
})
const earn = (atMs: number, payout: Payout): JournalEntry => ({
  kind: 'earn',
  source: 'health',
  id: `e${seq++}`,
  atMs,
  conditionId: 'cond-run',
  payout,
})

const state = (
  entries: JournalEntry[],
  cfg: LedgerConfig,
  atMs: number,
  walk?: Parameters<typeof desiredOsState>[3],
) => desiredOsState(appendEntries(emptyJournal(), entries).journal, cfg, atMs, walk)

describe('desiredOsState', () => {
  it('shields down with a 1-min ladder while balance remains', () => {
    expect(state([drain(at(0, 9)), drain(at(0, 9, 5))], config({ baseAllowanceMinutes: 5 }), at(0, 10))).toEqual({
      shields: 'down',
      drainThresholds: [3, 4, 5],
    })
  })

  it('shields up with nothing armed once the balance is empty', () => {
    expect(state([drain(at(0, 9), 60)], config(), at(0, 10))).toEqual({ shields: 'up', drainThresholds: [] })
  })

  it('Full Lock: up from the boundary, down after the first earn', () => {
    const cfg = config({ baseAllowanceMinutes: 0 })
    expect(state([], cfg, at(0, 9))).toEqual({ shields: 'up', drainThresholds: [] })
    expect(state([earn(at(0, 9, 30), { type: 'fixedChunk', minutes: 2 })], cfg, at(0, 10))).toEqual({
      shields: 'down',
      drainThresholds: [1, 2],
    })
  })

  it('a shield holiday keeps shields down with the ladder disarmed', () => {
    const entries = [drain(at(0, 9), 60), earn(at(0, 10), { type: 'setPeriod', minutes: 30 })]
    expect(state(entries, config(), at(0, 10, 15))).toEqual({ shields: 'down', drainThresholds: [] })
    // Holiday over, balance still empty → shields return.
    expect(state(entries, config(), at(0, 11))).toEqual({ shields: 'up', drainThresholds: [] })
  })

  it('an active walk window lifts shields even at zero balance — access, not credit', () => {
    const walk = planWalkIncrement(at(0, 10))
    expect(state([drain(at(0, 9), 60)], config(), at(0, 10, 5), walk)).toEqual({
      shields: 'down',
      drainThresholds: [],
    })
  })

  it('walking beats Full Lock (walking beats everything)', () => {
    const walk = planWalkIncrement(at(0, 10))
    expect(state([], config({ baseAllowanceMinutes: 0 }), at(0, 10, 5), walk).shields).toBe('down')
  })

  it('a walk session drains at full price: the ladder stays armed while balance remains', () => {
    const walk = planWalkIncrement(at(0, 10))
    expect(state([drain(at(0, 9), 58)], config(), at(0, 10, 5), walk)).toEqual({
      shields: 'down',
      drainThresholds: [59, 60],
    })
  })

  it('a lapsed walk window grants nothing: empty balance means shields up', () => {
    const walk = planWalkIncrement(at(0, 10))
    expect(state([drain(at(0, 9), 60)], config(), at(0, 10, 20), walk)).toEqual({
      shields: 'up',
      drainThresholds: [],
    })
  })

  it('an unlimited allowance keeps shields down with nothing armed', () => {
    expect(state([drain(at(0, 9), 500)], config({ baseAllowanceMinutes: UNLIMITED }), at(0, 10))).toEqual({
      shields: 'down',
      drainThresholds: [],
    })
  })
})
