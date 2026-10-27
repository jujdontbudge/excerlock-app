import type { EventSpecMap } from '../types'

export type PaywallPlacement = 'onboarding' | 'in_app' | 'winback'

export type PaywallOperation = 'load' | 'purchase' | 'restore'

export type PurchaseFailureClass = 'cancelled' | 'declined' | 'network' | 'unavailable' | 'unknown'

export type CheckoutStage = 'identity_ready' | 'recovery_journal' | 'integration_attach' | 'storekit' | 'result' | 'entitlement_verification'
export type CheckoutOutcome = 'success' | 'cancelled' | 'pending' | 'already_subscribed' | 'not_found' | 'failed'
export type CheckoutFailureKind = 'none' | 'transport' | 'auth' | 'verification' | 'storage' | 'vendor' | 'unknown' | 'timeout'
export type CheckoutAttemptProps = {
  attempt_id: string
  operation: 'purchase' | 'restore'
  placement: PaywallPlacement
  plan_id: string
}
export type CheckoutStageProps = CheckoutAttemptProps & {
  stage: CheckoutStage
  stage_result: 'started' | 'succeeded' | 'failed' | 'skipped' | 'timed_out'
  elapsed_ms: number
  failure_code?: number
  failure_kind?: CheckoutFailureKind
}
export type CheckoutCompletionProps = CheckoutAttemptProps & {
  outcome: CheckoutOutcome
  stage: CheckoutStage
  failing_stage: CheckoutStage | 'none'
  failure_kind: CheckoutFailureKind
  failure_code?: number
  duration_ms: number
  storekit_ms?: number
  sheet_observation: 'inactive' | 'not_observed' | 'not_called' | 'unavailable'
  entitlement_result: 'not_checked' | 'active' | 'none' | 'unverified' | 'failed'
}

export const paywallEvents = {
  paywall_viewed: { owner: 'client', transmittedProperties: ['placement', 'has_trial', 'variation_id', 'offer_arm', 'offer_source'] },
  paywall_error: { owner: 'client', transmittedProperties: ['operation'] },
  paywall_closed: { owner: 'client', transmittedProperties: ['placement'] },
  checkout_attempt_started: { owner: 'client', transmittedProperties: ['attempt_id', 'operation', 'placement', 'plan_id'] },
  checkout_stage_recorded: { owner: 'client', transmittedProperties: ['attempt_id', 'operation', 'placement', 'plan_id', 'stage', 'stage_result', 'elapsed_ms', 'failure_code', 'failure_kind'] },
  checkout_attempt_completed: { owner: 'client', transmittedProperties: ['attempt_id', 'operation', 'placement', 'plan_id', 'outcome', 'stage', 'failing_stage', 'failure_kind', 'failure_code', 'duration_ms', 'storekit_ms', 'sheet_observation', 'entitlement_result'] },
} as const satisfies EventSpecMap

export interface PaywallEventProps {
  paywall_viewed: { placement: PaywallPlacement; has_trial: boolean; variation_id?: string; offer_arm?: 'a' | 'b'; offer_source?: 'adapty' | 'fallback' }
  paywall_error: { operation: PaywallOperation }
  paywall_closed: { placement: PaywallPlacement }
  checkout_attempt_started: CheckoutAttemptProps
  checkout_stage_recorded: CheckoutStageProps
  checkout_attempt_completed: CheckoutCompletionProps
}
