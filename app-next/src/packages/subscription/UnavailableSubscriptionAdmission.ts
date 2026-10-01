import type { SubscriptionAdmissionPort } from '../ports/SubscriptionPort';

export function unavailableSubscriptionAdmission(): SubscriptionAdmissionPort {
  return {
    verify: async () => ({ type: 'unavailable' }),
    current: () => null,
    remainingMs: () => 0,
    invalidate: () => undefined,
  };
}
