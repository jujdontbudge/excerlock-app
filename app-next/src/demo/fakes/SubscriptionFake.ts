import { fakeOffer } from '../../content/subscription';
import { SubscriptionPort } from '../../ports/SubscriptionPort';
import { entitlementStore } from '../../state/entitlementStore';
import { FakeContext } from '../FakeContext';
import { mergeRestoredEntitlement } from '../../domain/mergeRestoredEntitlement';
export function SubscriptionFake(ctx: FakeContext): SubscriptionPort {
  const entitlement = () => ({ ...entitlementStore.getState().data.entitlement, offer: fakeOffer });
  return {
    entitlement,
    presentPaywall: async (placement, plan) => {
      if (ctx.result() === 'cancel') return entitlement();
      const next = {
        status: plan === 'annual' ? ('trial' as const) : ('active' as const),
        renewsAt: new Date(
          Date.parse(ctx.clock.now()) + (plan === 'annual' ? fakeOffer.trialDays : 30) * 86400000,
        ).toISOString(),
      };
      entitlementStore.getState().patch({ entitlement: next });
      ctx.log('paywall_completed', { placement, plan });
      return next;
    },
    restore: async () => {
      if (ctx.result() === 'cancel') return entitlement();
      ctx.log('restore');
      const current = entitlementStore.getState().data.entitlement,
        restored =
        ctx.snapshot().restoreOutcome === 'restored'
          ? { status: 'active' as const, renewsAt: new Date(Date.parse(ctx.clock.now()) + 30 * 86400000).toISOString() }
          : { status: 'none' as const, renewsAt: null },
        next = mergeRestoredEntitlement(current, restored);
      if (next !== current) entitlementStore.getState().patch({ entitlement: next });
      return entitlement();
    },
    identify: (id) => ctx.log('subscription_identify', { id }),
    reset: () => entitlementStore.getState().reset(),
    subscribe: (callback) => entitlementStore.subscribe((s) => callback(s.data.entitlement)),
  };
}
