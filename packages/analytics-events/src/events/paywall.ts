import type { EmptyProps, EventSpecMap } from '../types'

export type PaywallPlacement = 'onboarding' | 'in_app' | 'winback'

export type PaywallOperation = 'load' | 'purchase' | 'restore'

export type PurchaseFailureClass = 'cancelled' | 'declined' | 'network' | 'unavailable' | 'unknown'

export const paywallEvents = {
  paywall_viewed: { owner: 'client', transmittedProperties: ['placement', 'has_trial', 'variation_id', 'offer_arm', 'offer_source'] },
  purchase_started: { owner: 'client', transmittedProperties: ['placement', 'plan_id'] },
  purchase_failed: { owner: 'client', transmittedProperties: ['reason_class'] },
  paywall_error: { owner: 'client', transmittedProperties: ['operation'] },
  restore_started: { owner: 'client', transmittedProperties: [] },
  restore_succeeded: { owner: 'client', transmittedProperties: [] },
  restore_failed: { owner: 'client', transmittedProperties: ['reason_class'] },
} as const satisfies EventSpecMap

export interface PaywallEventProps {
  paywall_viewed: { placement: PaywallPlacement; has_trial: boolean; variation_id?: string; offer_arm?: 'a' | 'b'; offer_source?: 'adapty' | 'fallback' }
  purchase_started: { placement: PaywallPlacement; plan_id: string }
  purchase_failed: { reason_class: PurchaseFailureClass }
  paywall_error: { operation: PaywallOperation }
  restore_started: EmptyProps
  restore_succeeded: EmptyProps
  restore_failed: { reason_class: PurchaseFailureClass }
}
