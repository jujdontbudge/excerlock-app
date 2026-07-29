import { describe, expect, it } from 'vitest'
import { appendEntries, emptyJournal, entryKey } from '../src/journal'
import type { JournalEntry } from '../src/types'

const drain = (id: string, atMs: number, minutes = 1): JournalEntry => ({
  kind: 'drainTick',
  source: 'screentime',
  id,
  atMs,
  minutes,
})

const earn = (id: string, atMs: number, minutes: number): JournalEntry => ({
  kind: 'earn',
  source: 'health',
  id,
  atMs,
  conditionId: 'cond-run',
  payout: { type: 'fixedChunk', minutes },
})

describe('appendEntries', () => {
  it('appends new entries and reports them', () => {
    const { journal, appended } = appendEntries(emptyJournal(), [earn('w1', 100, 30), drain('t1', 200)])
    expect(journal.entries).toHaveLength(2)
    expect(appended).toHaveLength(2)
  })

  it('is idempotent: replaying the same entries is a no-op', () => {
    const first = appendEntries(emptyJournal(), [earn('w1', 100, 30), drain('t1', 200)])
    const replay = appendEntries(first.journal, [earn('w1', 100, 30), drain('t1', 200)])
    expect(replay.appended).toHaveLength(0)
    expect(replay.journal.entries).toEqual(first.journal.entries)
  })

  it('keys entries on (source, id) — same id under another source is distinct', () => {
    const { journal } = appendEntries(emptyJournal(), [
      earn('x', 100, 10),
      { ...drain('x', 200), source: 'screentime' },
    ])
    expect(journal.entries).toHaveLength(2)
    expect(entryKey(journal.entries[0]!)).not.toBe(entryKey(journal.entries[1]!))
  })

  it('first write wins: a duplicate key with a different payload is ignored', () => {
    const first = appendEntries(emptyJournal(), [earn('w1', 100, 30)])
    const dupe = appendEntries(first.journal, [earn('w1', 100, 999)])
    expect(dupe.appended).toHaveLength(0)
    const entry = dupe.journal.entries[0]!
    expect(entry.kind === 'earn' && entry.payout.type === 'fixedChunk' && entry.payout.minutes).toBe(30)
  })

  it('rejects negative or non-finite minutes', () => {
    expect(() => appendEntries(emptyJournal(), [drain('bad', 100, -1)])).toThrow()
    expect(() => appendEntries(emptyJournal(), [drain('bad', 100, Number.NaN)])).toThrow()
  })

  it('does not mutate the input journal', () => {
    const base = appendEntries(emptyJournal(), [drain('t1', 100)]).journal
    appendEntries(base, [drain('t2', 200)])
    expect(base.entries).toHaveLength(1)
  })
})
