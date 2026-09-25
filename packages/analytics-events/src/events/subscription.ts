import type { EventSpecMap } from '../types'

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
