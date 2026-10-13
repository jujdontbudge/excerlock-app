import { noteObservedEntitlement } from '../../../subscription/winbackSession';
import { fakeOffer } from '../../../subscription/subscriptionCopy';
import { SubscriptionPort } from '../../../ports/SubscriptionPort';
import { entitlementStore } from '../../../subscription/entitlementStore';
import { FakeContext } from '../FakeContext';
export function SubscriptionFake(ctx: FakeContext): SubscriptionPort {
  const entitlement = () => ({ ...entitlementStore.getState().data.entitlement, offer: fakeOffer });
  const noRecovery = { type: 'none' as const };
  let operation = { busy: false, pending: false, error: null as string | null };
  return {
    entitlement,
    presentPaywall: async (placement) => {
      if (ctx.result() === 'cancel') return entitlement();
      const next = {
        status: 'trial' as const,
        renewsAt: new Date(Date.parse(ctx.clock.now()) + fakeOffer.trialDays * 86400000).toISOString(),
        accessExpiresAt: new Date(Date.parse(ctx.clock.now()) + fakeOffer.trialDays * 86400000).toISOString(),
      };
      entitlementStore.getState().patch({ entitlement: next });
      noteObservedEntitlement(next.status);
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
      noteObservedEntitlement(next.status);
      return entitlement();
    },
    identify: async (id) => {
      ctx.log('subscription_identify', { id });
    },
    reset: async () => {
      entitlementStore.getState().reset();
    },
    refresh: async () => entitlement(),
    loadPaywall: async (placement) => ({
      placement,
      title: 'Choose your plan',
      body: 'Build a healthier relationship with your phone.',
      flowVariationId: 'fake',
      generation: 0,
      products: [
        {
          handle: 'fake:annual',
          vendorProductId: 'fake.annual',
          title: 'Annual',
          detail: '',
          localizedPrice: '$49.99',
          localizedPeriod: 'year',
          localizedWeeklyPrice: '$0.96',
          periodUnit: 'year',
          offerLabel: fakeOffer.label,
          trialOffer: fakeOffer,
          recommended: true,
        },
        {
          handle: 'fake:monthly',
          vendorProductId: 'fake.monthly',
          title: 'Monthly',
          detail: '',
          localizedPrice: '$9.99',
          localizedPeriod: 'month',
          localizedWeeklyPrice: '$2.31',
          periodUnit: 'month',
          offerLabel: fakeOffer.label,
          trialOffer: fakeOffer,
          recommended: false,
        },
        {
          handle: 'fake:annual-now',
          vendorProductId: 'fake.annual.now',
          title: 'Annual',
          detail: '',
          localizedPrice: '$49.99',
          localizedPeriod: 'year',
          localizedWeeklyPrice: '$0.96',
          periodUnit: 'year',
          offerLabel: null,
          recommended: false,
        },
        {
          handle: 'fake:monthly-now',
          vendorProductId: 'fake.monthly.now',
          title: 'Monthly',
          detail: '',
          localizedPrice: '$9.99',
          localizedPeriod: 'month',
          localizedWeeklyPrice: '$2.31',
          periodUnit: 'month',
          offerLabel: null,
          recommended: false,
        },
      ],
    }),
    logPaywallShown: async () => undefined,
    purchase: async (handle) => {
      operation = { busy: true, pending: false, error: null };
      try {
        if (ctx.result() === 'cancel') return { type: 'user_cancelled' as const };
        const next = {
          status: handle.endsWith('-now') ? 'active' as const : 'trial' as const,
          renewsAt: new Date(Date.parse(ctx.clock.now()) + (handle.endsWith('-now') ? 30 : fakeOffer.trialDays) * 86400000).toISOString(),
          accessExpiresAt: new Date(Date.parse(ctx.clock.now()) + (handle.endsWith('-now') ? 30 : fakeOffer.trialDays) * 86400000).toISOString(),
        };
        entitlementStore.getState().patch({ entitlement: next });
      noteObservedEntitlement(next.status);
        return { type: 'success' as const, entitlement: next };
      } finally {
        operation = { ...operation, busy: false };
      }
    },
    operation: () => operation,
    recovery: () => noRecovery,
    recoveryReady: async () => undefined,
    clearRecovery: async () => undefined,
    subscribeRecovery: () => () => undefined,
    manageSubscription: async () => {
      ctx.log('subscription_management_opened');
    },
    subscribe: (callback) => entitlementStore.subscribe((s) => callback(s.data.entitlement)),
  };
}
