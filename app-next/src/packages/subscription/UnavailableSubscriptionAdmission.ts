import type { SubscriptionAdmissionPort } from '../ports/SubscriptionPort';

export function unavailableSubscriptionAdmission(): SubscriptionAdmissionPort {
  return {
    verify: async () => ({ type: 'unavailable' }),
    current: () => null,
    invalidate: () => undefined,
  };
}
