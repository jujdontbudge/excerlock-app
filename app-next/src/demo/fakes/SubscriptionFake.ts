import { SubscriptionPort } from '../../ports/SubscriptionPort';
import { entitlementStore } from '../../state/entitlementStore';
import { FakeContext } from '../FakeContext';
export function SubscriptionFake(ctx: FakeContext): SubscriptionPort {
  const entitlement = () => entitlementStore.getState().data.entitlement;
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
      ctx.result();
      ctx.log('restore');
      entitlementStore.getState().patch({ entitlement: ctx.scenario.entitlement });
      return entitlement();
    },
    identify: (id) => ctx.log('subscription_identify', { id }),
    reset: () => entitlementStore.getState().reset(),
    subscribe: (callback) => entitlementStore.subscribe((s) => callback(s.data.entitlement)),
  };
}
