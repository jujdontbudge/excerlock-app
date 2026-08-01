import { describe, expect, it } from 'vitest'
import {
  EVENTS,
  EVENT_NAMES,
  eventsOwnedBy,
  ownerOf,
  transmittedPropertiesOf,
} from '../index'
import { conditionEvents } from '../src/events/conditions'
import { engagementEvents } from '../src/events/engagement'
import { onboardingEvents } from '../src/events/onboarding'
import { paywallEvents } from '../src/events/paywall'
import { shieldEvents } from '../src/events/shield'
import { subscriptionEvents } from '../src/events/subscription'
import { supportEvents } from '../src/events/support'
import { vendorEvents } from '../src/events/vendors'

// D3: object_action, lowercase snake_case, static literals. No $-prefix (PostHog-reserved).
const SNAKE_CASE = /^[a-z][a-z0-9]*(?:_[a-z0-9]+)*$/

describe('event registry shape', () => {
  it('is non-empty', () => {
    expect(EVENT_NAMES.length).toBeGreaterThan(0)
  })

  it('every event name is lowercase snake_case (D3)', () => {
    for (const name of EVENT_NAMES) {
      expect(name, `event name "${name}" is not snake_case`).toMatch(SNAKE_CASE)
    }
  })

  it('never touches the PostHog-reserved $ namespace (D3)', () => {
    for (const name of EVENT_NAMES) {
      expect(name.startsWith('$')).toBe(false)
    }
  })

  it('every event has exactly one owner from the closed set (D4)', () => {
    for (const name of EVENT_NAMES) {
      expect(['client', 'server', 'adapty']).toContain(EVENTS[name].owner)
    }
  })

  it('EVENT_NAMES lists every registry key exactly once, sorted', () => {
    expect([...EVENT_NAMES]).toEqual(Object.keys(EVENTS).sort())
    expect(new Set(EVENT_NAMES).size).toBe(EVENT_NAMES.length)
  })

  it('domain modules declare disjoint event names (a spread collision would silently drop one)', () => {
    const modules = [
      onboardingEvents,
      conditionEvents,
      shieldEvents,
      paywallEvents,
      engagementEvents,
      supportEvents,
      vendorEvents,
      subscriptionEvents,
    ]
    const total = modules.reduce((n, m) => n + Object.keys(m).length, 0)
    expect(Object.keys(EVENTS).length).toBe(total)
  })
})

describe('single-emitter ownership (D4/D5)', () => {
  it('the three owner sets partition the registry', () => {
    const union = [
      ...eventsOwnedBy('client'),
      ...eventsOwnedBy('server'),
      ...eventsOwnedBy('adapty'),
    ]
    expect(union.length).toBe(EVENT_NAMES.length)
    expect([...union].sort()).toEqual([...EVENT_NAMES].sort())
  })

  it('anchor events sit with their PRD-mandated owner', () => {
    // Client: funnel + on-device domain truth (PRD §5 — earning stays on-device).
    expect(ownerOf('onboarding_screen_viewed')).toBe('client')
    expect(ownerOf('onboarding_answer')).toBe('client')
    expect(ownerOf('paywall_viewed')).toBe('client')
    expect(ownerOf('purchase_started')).toBe('client')
    expect(ownerOf('condition_created')).toBe('client')
    expect(ownerOf('earn_claimed')).toBe('client')
    expect(ownerOf('shields_applied')).toBe('client')
    // Server: persisted /v1 domain actions (PRD §10.1).
    expect(ownerOf('support_request_submitted')).toBe('server')
    expect(ownerOf('vendor_connected')).toBe('server')
    expect(ownerOf('vendor_earn_recorded')).toBe('server')
    expect(ownerOf('account_deleted')).toBe('server')
    // Adapty: subscription lifecycle via the native integration (D9, PRD §10.3).
    expect(ownerOf('trial_started')).toBe('adapty')
    expect(ownerOf('subscription_renewed')).toBe('adapty')
  })

  it('no client- or server-owned event pretends to be subscription lifecycle (D9)', () => {
    const nonAdapty = [...eventsOwnedBy('client'), ...eventsOwnedBy('server')]
    for (const name of nonAdapty) {
      expect(name.startsWith('subscription_')).toBe(false)
      expect(name.startsWith('trial_')).toBe(false)
    }
  })

  it('gives every client event one canonical transmission allowlist', () => {
    for (const name of eventsOwnedBy('client')) {
      expect(EVENTS[name]).toHaveProperty('transmittedProperties')
      expect(transmittedPropertiesOf(name as Parameters<typeof transmittedPropertiesOf>[0]))
        .toEqual((EVENTS[name] as { transmittedProperties: readonly string[] }).transmittedProperties)
    }
  })
})
