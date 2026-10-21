import type {
  SubscriptionAdmissionLease,
  SubscriptionAdmissionPort,
  SubscriptionPort,
} from '../../../ports/SubscriptionPort';
import type { AuthPort } from '../../../ports/AuthPort';
import { reviewAdmission } from './reviewAdmission';
import { FakeContext } from '../FakeContext';

const MAX_LEASE_MS = 5 * 60_000;

export function SubscriptionAdmissionFake(
  ctx: FakeContext,
  auth: AuthPort,
  subscription: SubscriptionPort,
): SubscriptionAdmissionPort & { prepare(): void } {
  const review = reviewAdmission(ctx, auth);
  let lease: SubscriptionAdmissionLease | null = null;
  const remainingMs: SubscriptionAdmissionPort['remainingMs'] = (identity) => {
    if (ctx.scenario.admissionFailure) return review.remainingMs(identity);
    if (!lease || lease.userId !== identity.userId || lease.generation !== identity.generation) return 0;
    const deadline = Math.min(Date.parse(lease.expiresAt), Date.parse(lease.verifiedAt) + MAX_LEASE_MS);
    return Math.max(0, deadline - Date.parse(ctx.clock.now()));
  };
  const current: SubscriptionAdmissionPort['current'] = (identity) => ctx.scenario.admissionFailure ? review.current(identity) : remainingMs(identity) > 0 ? lease : null;
  return {
    prepare: () => review.prepare(),
    current,
    remainingMs,
    invalidate: () => { lease = null; review.invalidate(); },
    verify: async (identity) => {
      if (ctx.scenario.admissionFailure) return review.verify(identity);
      const proof = ctx.scenario.subscriptionProof ?? 'matching';
      const live = auth.identity();
      if (live.userId !== identity.userId || live.generation !== identity.generation || proof === 'unavailable')
        return { type: 'unavailable' };
      if (proof === 'wrongAccount' || proof === 'wrongEnvironment') {
        lease = null;
        return { type: 'unavailable' };
      }
      if (proof === 'ineligible') {
        lease = null;
        if (ctx.scenario.identityLab?.providerAttempts || ctx.scenario.identityLab?.emailChallenges)
          ctx.log('subscription_proof_checked', { account: identity.userId, result: 'ineligible' });
        return { type: 'ineligible' };
      }
      const entitlement = subscription.entitlement();
      const expiresAt = entitlement.accessExpiresAt ?? entitlement.renewsAt;
      if (!['active', 'trial'].includes(entitlement.status) || !expiresAt || Date.parse(expiresAt) <= Date.parse(ctx.clock.now())) {
        lease = null;
        return { type: 'ineligible' };
      }
      lease = {
        userId: identity.userId,
        generation: identity.generation,
        environment: 'sandbox',
        expiresAt,
        observedAt: ctx.clock.now(),
        verifiedAt: ctx.clock.now(),
      };
      ctx.log('subscription_proof_verified', { account: identity.userId, environment: lease.environment });
      return { type: 'eligible', lease };
    },
  };
}
