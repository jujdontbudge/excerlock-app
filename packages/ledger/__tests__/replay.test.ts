import { describe, expect, it } from 'vitest'
import fixture from '../fixtures/canonical-day.json'
import {
  appendEntries,
  daySummaries,
  desiredOsState,
  emptyJournal,
  remainingMinutes,
  type JournalEntry,
  type LedgerConfig,
} from '../index'

const config = fixture.config as LedgerConfig
const entries = fixture.entries as JournalEntry[]
const DAY1_NOON = 24 * 3600_000 + 12 * 3600_000

describe('canonical-day fixture replay (public surface)', () => {
  it('reduces the timeline to the expected day-0 summary', () => {
    const { journal } = appendEntries(emptyJournal(), entries)
    const [day0, day1] = daySummaries(journal, config, DAY1_NOON)
    expect(day0).toMatchObject(fixture.expect.day0)
    expect(day1).toMatchObject(fixture.expect.day1)
  })

  it('replaying the whole timeline again changes nothing (idempotence, end to end)', () => {
    const once = appendEntries(emptyJournal(), entries).journal
    const twice = appendEntries(once, entries).journal
    expect(daySummaries(twice, config, DAY1_NOON)).toEqual(daySummaries(once, config, DAY1_NOON))
    expect(remainingMinutes(twice, config, DAY1_NOON)).toBe(remainingMinutes(once, config, DAY1_NOON))
  })

  it('ends day 0 drained: shields up, nothing armed', () => {
    const { journal } = appendEntries(emptyJournal(), entries)
    expect(desiredOsState(journal, config, 20 * 3600_000)).toEqual({ shields: 'up', drainThresholds: [] })
  })
})
