import type { EventSpecMap } from '../types'

/** Onboarding hard paywall vs any later in-app surface (shared vocabulary, D-props). */
export type PaywallPlacement = 'onboarding' | 'in_app'

const PLACEMENTS = ['onboarding', 'in_app'] as const

/**
 * The client half of the purchase funnel (view + CTA press). Everything after
 * the purchase sheet belongs to the Adapty integration (see subscription.ts) —
 * the client never emits purchase outcomes (D9).
 */
export const paywallEvents = {
  paywall_viewed: {
    owner: 'client',
    transmittedProperties: ['placement', 'has_trial'],
    enumProperties: { placement: PLACEMENTS },
  },
  purchase_started: {
    owner: 'client',
    transmittedProperties: ['placement', 'plan_id'],
    enumProperties: { placement: PLACEMENTS },
  },
} as const satisfies EventSpecMap

export interface PaywallEventProps {
  paywall_viewed: { placement: PaywallPlacement; has_trial: boolean }
  // plan_id is the Adapty product id — the paywall renders whatever the placement returns.
  purchase_started: { placement: PaywallPlacement; plan_id: string }
}
