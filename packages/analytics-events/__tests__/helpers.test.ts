import { describe, expect, it } from 'vitest'
import { EVENT_NAMES, eventsOwnedBy, isRegisteredEvent, ownerOf } from '../index'

describe('ownerOf', () => {
  it('returns the declared owner for a registered event', () => {
    expect(ownerOf('paywall_viewed')).toBe('client')
    expect(ownerOf('support_request_submitted')).toBe('server')
    expect(ownerOf('billing_issue_detected')).toBe('adapty')
  })
})

describe('eventsOwnedBy', () => {
  it('returns only events with the requested owner', () => {
    for (const owner of ['client', 'server', 'adapty'] as const) {
      const names = eventsOwnedBy(owner)
      expect(names.length).toBeGreaterThan(0)
      for (const name of names) expect(ownerOf(name)).toBe(owner)
    }
  })

  it('returns sorted names (stable output for the guardrail test to diff)', () => {
    for (const owner of ['client', 'server', 'adapty'] as const) {
      const names = eventsOwnedBy(owner)
      expect([...names].sort()).toEqual(names)
    }
  })
})

describe('isRegisteredEvent', () => {
  it('accepts every registered name', () => {
    for (const name of EVENT_NAMES) expect(isRegisteredEvent(name)).toBe(true)
  })

  it('rejects unregistered and reserved names', () => {
    expect(isRegisteredEvent('made_up_event')).toBe(false)
    expect(isRegisteredEvent('$screen')).toBe(false)
    expect(isRegisteredEvent('')).toBe(false)
  })
})
