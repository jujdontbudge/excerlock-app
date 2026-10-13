import type { OnboardingOffer, OnboardingOfferPort } from '../ports/OnboardingOfferPort';
import type { AnalyticsPort } from '../ports/AnalyticsPort';
import type { SubscriptionPaywall, SubscriptionPort } from '../ports/SubscriptionPort';
import { fallbackTrialOffer, paywallTrialOffer } from './trialOffer';

const noTrialPlans = [
  'com.johansardar.excerlock.premium.a.monthly.notrial',
  'com.johansardar.excerlock.premium.a.annual.notrial',
];
const fallback = (): OnboardingOffer => ({ arm: 'a', source: 'fallback', offer: fallbackTrialOffer, trialAvailable: true, variationId: '' });

function armFor(paywall: SubscriptionPaywall): 'a' | 'b' | null {
  if (paywall.trial === false) {
    return paywall.products.length === 2
      && noTrialPlans.every((id) => paywall.products.some((product) => product.vendorProductId === id && !product.offerLabel))
      ? 'b' : null;
  }
  return paywall.products.some((product) => !noTrialPlans.includes(product.vendorProductId)) ? 'a' : null;
}

export function createOnboardingOffer(deps: {
  subscription: SubscriptionPort;
  analytics: AnalyticsPort;
  identityGeneration(): number;
}): OnboardingOfferPort {
  let epoch = 0;
  let boundIdentity: number | null = null;
  let candidate: SubscriptionPaywall | null = null;
  let retained: SubscriptionPaywall | null = null;
  let locked: OnboardingOffer | null = null;
  let prefetching: Promise<void> | null = null;
  let loading: Promise<SubscriptionPaywall> | null = null;
  let exposed = false;
  const reset = () => {
    epoch += 1;
    boundIdentity = null;
    candidate = retained = null;
    locked = null;
    prefetching = null;
    loading = null;
    exposed = false;
  };
  const syncIdentity = () => {
    if (boundIdentity !== null && boundIdentity !== deps.identityGeneration()) reset();
  };
  const freeze = (keepTrialScreens = false): OnboardingOffer => {
    syncIdentity();
    if (locked) return locked;
    boundIdentity = deps.identityGeneration();
    const arm = candidate ? armFor(candidate) : null;
    if (candidate && arm && (!keepTrialScreens || (arm === 'a' && candidate.products.some((product) => product.offerLabel)))) {
      retained = candidate;
      locked = {
        arm,
        source: typeof candidate.trial === 'boolean' ? 'adapty' : 'fallback',
        offer: paywallTrialOffer(candidate.products),
        trialAvailable: arm === 'a' && candidate.products.some((product) => product.offerLabel !== null),
        variationId: candidate.flowVariationId,
      };
    } else locked = fallback();
    return locked;
  };
  return {
    reset,
    snapshot() { syncIdentity(); return locked ?? fallback(); },
    freeze,
    prefetch() {
      syncIdentity();
      if (locked || candidate) return Promise.resolve();
      if (prefetching) return prefetching;
      const started = epoch;
      prefetching = deps.subscription.loadPaywall('onboarding').then((paywall) => {
        if (started !== epoch || locked) return;
        boundIdentity = deps.identityGeneration();
        candidate = paywall;
      }).catch(() => undefined);
      return prefetching;
    },
    loadPaywall() {
      freeze();
      if (retained) return Promise.resolve(retained);
      if (loading) return loading;
      const started = epoch;
      loading = deps.subscription.loadPaywall('onboarding', { onboardingTrialFallback: true }).then((paywall) => {
        if (started !== epoch || armFor(paywall) !== 'a') throw new Error('Onboarding trial plans unavailable');
        boundIdentity = deps.identityGeneration();
        retained = paywall;
        return paywall;
      }).finally(() => { if (started === epoch) loading = null; });
      return loading;
    },
    expose() {
      syncIdentity();
      if (exposed) return;
      const offer = freeze();
      exposed = true;
      deps.analytics.track('onboarding_offer_exposed', {
        arm: offer.arm,
        source: offer.source,
        intro_offer: offer.variationId ? (offer.trialAvailable ? 'available' : 'unavailable') : 'unknown',
        variation_id: offer.variationId || undefined,
      });
    },
  };
}
