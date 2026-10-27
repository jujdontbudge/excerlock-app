import { noteObservedEntitlement } from '../../../subscription/winbackSession';
import { fakeOffer } from '../../../subscription/subscriptionCopy';
import { SubscriptionPort } from '../../../ports/SubscriptionPort';
import { entitlementStore } from '../../../subscription/entitlementStore';
import { FakeContext } from '../FakeContext';
import { CheckoutDiagnostics } from '../../../subscription/CheckoutDiagnostics';
import { AnalyticsFake } from './AnalyticsFake';
import type { SubscriptionPaywall } from '../../../ports/SubscriptionPort';
export function SubscriptionFake(ctx: FakeContext): SubscriptionPort {
  const entitlement = () => ({ ...entitlementStore.getState().data.entitlement, offer: fakeOffer });
  let operation = { busy: false, pending: false, error: null as string | null };
  let placement: SubscriptionPaywall['placement'] = 'in_app';
  const analytics = AnalyticsFake(ctx);
  return {
    entitlement,
    restore: async (context) => {
      const attempt = new CheckoutDiagnostics(analytics, { operation: 'restore', placement: context?.placement ?? placement, plan_id: 'none' });
      try {
        attempt.stage('storekit');
        if (ctx.result() === 'cancel') return entitlement();
        ctx.log('restore');
        const next =
          ctx.snapshot().restoreOutcome === 'restored'
            ? { status: 'active' as const, renewsAt: new Date(Date.parse(ctx.clock.now()) + 30 * 86400000).toISOString() }
            : { status: 'none' as const, renewsAt: null };
        entitlementStore.getState().patch({ entitlement: next });
        noteObservedEntitlement(next.status);
        attempt.stage('entitlement_verification');
        attempt.entitlement(next.status === 'active' ? 'active' : 'none');
        attempt.result(next.status === 'active' ? 'success' : 'not_found');
        return entitlement();
      } catch (error) {
        attempt.fail(error);
        throw error;
      } finally {
        attempt.complete();
      }
    },
    identify: async (id) => {
      ctx.log('subscription_identify', { id });
    },
    reset: async () => {
      entitlementStore.getState().reset();
    },
    refresh: async () => entitlement(),
    loadPaywall: async (nextPlacement) => {
      placement = nextPlacement;
      return {
        placement: nextPlacement,
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
            localizedPrice: '$39.99',
            localizedPeriod: 'year',
            localizedWeeklyPrice: '$0.77',
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
            localizedPrice: '$39.99',
            localizedPeriod: 'year',
            localizedWeeklyPrice: '$0.77',
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
      };
    },
    logPaywallShown: async () => undefined,
    purchase: async (handle) => {
      operation = { busy: true, pending: false, error: null };
      const attempt = new CheckoutDiagnostics(analytics, { operation: 'purchase', placement, plan_id: handle.replace('fake:', 'fake.').replace('-now', '.now') });
      try {
        const result = await attempt.storeKit(async () => ctx.result());
        attempt.stage('result');
        if (result === 'cancel') {
          attempt.result('cancelled');
          return { type: 'user_cancelled' as const };
        }
        attempt.result('success');
        attempt.stage('entitlement_verification');
        const next = {
          status: handle.endsWith('-now') ? 'active' as const : 'trial' as const,
          renewsAt: new Date(Date.parse(ctx.clock.now()) + (handle.endsWith('-now') ? 30 : fakeOffer.trialDays) * 86400000).toISOString(),
          accessExpiresAt: new Date(Date.parse(ctx.clock.now()) + (handle.endsWith('-now') ? 30 : fakeOffer.trialDays) * 86400000).toISOString(),
        };
        entitlementStore.getState().patch({ entitlement: next });
        noteObservedEntitlement(next.status);
        attempt.entitlement('active');
        return { type: 'success' as const, entitlement: next };
      } catch (error) {
        attempt.fail(error);
        throw error;
      } finally {
        attempt.complete();
        operation = { ...operation, busy: false };
      }
    },
    operation: () => operation,
    manageSubscription: async () => {
      ctx.log('subscription_management_opened');
    },
    subscribe: (callback) => entitlementStore.subscribe((s) => callback(s.data.entitlement)),
  };
}
