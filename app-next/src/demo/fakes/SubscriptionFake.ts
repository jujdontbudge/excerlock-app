import { fakeOffer } from '../../content/subscription';
import { SubscriptionPort } from '../../ports/SubscriptionPort';
import { entitlementStore } from '../../state/entitlementStore';
import { FakeContext } from '../FakeContext';
export function SubscriptionFake(ctx: FakeContext): SubscriptionPort {
  const entitlement = () => ({ ...entitlementStore.getState().data.entitlement, offer: fakeOffer });
  return {
    entitlement,
    presentPaywall: async (placement) => {
      if (ctx.result() === 'cancel') return entitlement();
      const next = {
        status: 'trial' as const,
        renewsAt: new Date(Date.parse(ctx.clock.now()) + 7 * 86400000).toISOString(),
      };
      entitlementStore.getState().patch({ entitlement: next });
      ctx.log('paywall_completed', { placement });
      return next;
    },
    restore: async () => {
      if (ctx.result() === 'cancel') return entitlement();
      ctx.log('restore');
      const next =
        ctx.snapshot().restoreOutcome === 'restored'
          ? { status: 'active' as const, renewsAt: new Date(Date.parse(ctx.clock.now()) + 30 * 86400000).toISOString() }
          : { status: 'none' as const, renewsAt: null };
      entitlementStore.getState().patch({ entitlement: next });
      return entitlement();
    },
    identify: async (id) => {
      ctx.log('subscription_identify', { id });
    },
    reset: async () => {
      entitlementStore.getState().reset();
    },
    subscribe: (callback) => entitlementStore.subscribe((s) => callback(s.data.entitlement)),
  };
}
