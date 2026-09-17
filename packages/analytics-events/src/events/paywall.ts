import type { EmptyProps, EventSpecMap } from '../types'

/**
 * Onboarding hard paywall, any later in-app surface, or the discounted win-back
 * offer fired by the onboarding decline and by a lapsed entitlement on return
 * (shared vocabulary, D-props).
 */
export type PaywallPlacement = 'onboarding' | 'in_app' | 'winback'

/** The three paywall operations the client reports failures for. */
export type PaywallOperation = 'load' | 'purchase' | 'restore'

/**
 * How a purchase or restore failed, as a bounded class — never the SDK message
 * (D12). Extend this union when the client maps a new class where it reports
 * PaywallScreen failures.
 */
export type PurchaseFailureClass = 'cancelled' | 'declined' | 'network' | 'unavailable' | 'unknown'

/**
 * The client half of the purchase funnel: the view, the CTA press, and the
 * intent-side failures and restores. Everything after the purchase sheet
 * belongs to the Adapty integration (see subscription.ts) — the client never
 * emits purchase outcomes or money truth (D9), and `restore_*` claims only that
 * the client asked the store to restore, never what the store answered with
 * revenue.
 *
 * `variation_id` is the Adapty flow variation id carried on the view so every
 * funnel step breaks down per experiment arm.
 */
export const paywallEvents = {
  paywall_viewed: { owner: 'client', transmittedProperties: ['placement', 'has_trial', 'variation_id'] },
  purchase_started: { owner: 'client', transmittedProperties: ['placement', 'plan_id'] },
  purchase_failed: { owner: 'client', transmittedProperties: ['reason_class'] },
  // The client's own failure signal (Sentry gets the error; PostHog gets the class).
  paywall_error: { owner: 'client', transmittedProperties: ['operation'] },
  restore_started: { owner: 'client', transmittedProperties: [] },
  restore_succeeded: { owner: 'client', transmittedProperties: [] },
  restore_failed: { owner: 'client', transmittedProperties: ['reason_class'] },
} as const satisfies EventSpecMap

export interface PaywallEventProps {
  paywall_viewed: { placement: PaywallPlacement; has_trial: boolean; variation_id?: string }
  // plan_id is the Adapty product id — the paywall renders whatever the placement returns.
  purchase_started: { placement: PaywallPlacement; plan_id: string }
  purchase_failed: { reason_class: PurchaseFailureClass }
  paywall_error: { operation: PaywallOperation }
  restore_started: EmptyProps
  restore_succeeded: EmptyProps
  restore_failed: { reason_class: PurchaseFailureClass }
}
