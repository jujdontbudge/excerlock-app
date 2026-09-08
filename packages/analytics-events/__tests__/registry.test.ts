import { describe, expect, it } from 'vitest'
import {
  enumValuesOf,
  EVENTS,
  EVENT_NAMES,
  eventsOwnedBy,
  ownerOf,
  transmittedPropertiesOf,
  type ClientEventName,
} from '../index'
import { ceremonyEvents } from '../src/events/ceremony'
import { conditionEvents } from '../src/events/conditions'
import { engagementEvents } from '../src/events/engagement'
import { onboardingEvents } from '../src/events/onboarding'
import { paywallEvents } from '../src/events/paywall'
import { shieldEvents } from '../src/events/shield'
import { subscriptionEvents } from '../src/events/subscription'
import { supportEvents } from '../src/events/support'

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
      ceremonyEvents,
      paywallEvents,
      engagementEvents,
      supportEvents,
      subscriptionEvents,
    ]
    const total = modules.reduce((n, m) => n + Object.keys(m).length, 0)
    expect(Object.keys(EVENTS).length).toBe(total)
  })
})

describe('the v1 cut (B16, vendor sync)', () => {
  it('drops the events the rebuild removed', () => {
    for (const retired of [
      'earn_claimed',
      'sick_day_override_used',
      'milestone_unlocked',
      'share_card_shared',
      'notification_toggled',
      'walk_session_started',
      'walk_session_ended',
      'vendor_connected',
      'vendor_disconnected',
      'vendor_earn_recorded',
    ]) {
      expect(EVENT_NAMES, `"${retired}" is retired`).not.toContain(retired)
    }
  })

  it('keeps the trial-reminder open and adds the rebuilt client events', () => {
    for (const kept of [
      'notification_opened',
      'rule_met',
      'apps_unlocked_rest_of_day',
      'walking_session_started',
      'walking_session_ended',
      'setup_permission_result',
      'sign_in_completed',
    ]) {
      expect(EVENT_NAMES).toContain(kept)
    }
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
    expect(ownerOf('rule_met')).toBe('client')
    expect(ownerOf('shields_applied')).toBe('client')
    expect(ownerOf('unlock_ceremony_done')).toBe('client')
    // Server: persisted /v1 domain actions (PRD §10.1).
    expect(ownerOf('support_request_submitted')).toBe('server')
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
      expect(transmittedPropertiesOf(name as ClientEventName)).toEqual(
        (EVENTS[name] as { transmittedProperties: readonly string[] }).transmittedProperties,
      )
    }
  })
})

describe('the privacy floor (D12)', () => {
  // The three things the App Privacy label promises never leave the device: which gym,
  // where it is, and which apps are locked. A property named for any of them is the
  // failure mode this test exists to catch.
  const FORBIDDEN = [
    'address',
    'app_name',
    'apps',
    'bundle',
    'bundle_id',
    'category_name',
    'coordinate',
    'email',
    'gym',
    'gym_name',
    'lat',
    'latitude',
    'lng',
    'lon',
    'longitude',
    'message',
    'name',
    'place',
    'place_name',
    'reason_text',
    'selection',
    'text',
    'token',
  ]

  it('no client event transmits a property named for a gym, a coordinate, or an app', () => {
    const offenders = eventsOwnedBy('client').flatMap((name) =>
      transmittedPropertiesOf(name as ClientEventName)
        .filter((property) => FORBIDDEN.includes(property))
        .map((property) => `${name}.${property}`),
    )
    expect(offenders).toEqual([])
  })

  it('never transmits the distance to a saved gym', () => {
    expect(transmittedPropertiesOf('gym_unlock_tapped')).not.toContain('distance')
  })

  it('declares a value floor for every free-text-prone property', () => {
    // `reason` is filled from a caught exception at one call site; without the floor its
    // message — a path, a gym name, a bundle id — would reach PostHog verbatim.
    expect(enumValuesOf('treadmill_scan_failed', 'reason')).toEqual([
      'denied',
      'restricted',
      'notDetermined',
      'timeout',
      'exception',
    ])
  })

  it('every declared value floor names a transmitted property', () => {
    for (const name of eventsOwnedBy('client')) {
      const spec = EVENTS[name] as { enumProperties?: Record<string, readonly string[]> }
      for (const property of Object.keys(spec.enumProperties ?? {})) {
        expect(
          transmittedPropertiesOf(name as ClientEventName),
          `${name}.${property} declares values but is never transmitted`,
        ).toContain(property)
      }
    }
  })
})
