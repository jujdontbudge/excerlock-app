import type { EventSpecMap } from '../types'

/**
 * Subscription lifecycle — owned by the native Adapty → PostHog integration
 * (D9, PRD §10.3). Neither the app nor the server may ever `capture()` these:
 * the server's Adapty webhook drives the Postgres entitlement mirror ONLY.
 *
 * Names follow Adapty's default event types (vendor namespace — exempt from
 * the object_action law the same way Regen kept the default `rc_*` names).
 * They must be verified against the integration's event-name config when the
 * PostHog integration is wired (Phase 5); this file is the single place to
 * correct them.
 */
export const subscriptionEvents = {
  trial_started: { owner: 'adapty' },
  trial_converted: { owner: 'adapty' },
  trial_renewal_cancelled: { owner: 'adapty' },
  subscription_started: { owner: 'adapty' },
  subscription_renewed: { owner: 'adapty' },
  subscription_renewal_cancelled: { owner: 'adapty' },
  subscription_expired: { owner: 'adapty' },
  subscription_refunded: { owner: 'adapty' },
  billing_issue_detected: { owner: 'adapty' },
  entered_grace_period: { owner: 'adapty' },
} as const satisfies EventSpecMap

/**
 * Adapty controls the forwarded payload; we type only the fields our funnels
 * and revenue insights rely on, all optional.
 */
export type AdaptyForwardedProps = {
  product_id?: string
  store?: string
  price_usd?: number
}

export interface SubscriptionEventProps {
  trial_started: AdaptyForwardedProps
  trial_converted: AdaptyForwardedProps
  trial_renewal_cancelled: AdaptyForwardedProps
  subscription_started: AdaptyForwardedProps
  subscription_renewed: AdaptyForwardedProps
  subscription_renewal_cancelled: AdaptyForwardedProps
  subscription_expired: AdaptyForwardedProps
  subscription_refunded: AdaptyForwardedProps
  billing_issue_detected: AdaptyForwardedProps
  entered_grace_period: AdaptyForwardedProps
}
