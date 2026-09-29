import type {
  SubscriptionAdmissionLease,
  SubscriptionAdmissionPort,
  SubscriptionPort,
} from '../../../ports/SubscriptionPort';
import type { AuthPort } from '../../../ports/AuthPort';
import { FakeContext } from '../FakeContext';

export function SubscriptionAdmissionFake(
  ctx: FakeContext,
  auth: AuthPort,
  subscription: SubscriptionPort,
): SubscriptionAdmissionPort {
  let lease: SubscriptionAdmissionLease | null = null;
  const current: SubscriptionAdmissionPort['current'] = (identity) => {
    if (!lease || lease.userId !== identity.userId || lease.generation !== identity.generation) return null;
    return Date.parse(lease.expiresAt) > Date.parse(ctx.clock.now()) ? lease : null;
  };
  return {
    current,
    invalidate: () => { lease = null; },
    verify: async (identity) => {
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
        if (ctx.scenario.identityLab?.providerAttempts)
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
