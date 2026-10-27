import type { OnboardingOffer, OnboardingOfferPort } from '../ports/OnboardingOfferPort';
import type { AnalyticsPort } from '../ports/AnalyticsPort';
import type { SubscriptionPaywall, SubscriptionPort } from '../ports/SubscriptionPort';
import { fallbackTrialOffer, paywallTrialOffer } from './trialOffer';

const unloaded: OnboardingOffer = { arm: 'a', assigned: 'a', source: 'fallback', offer: fallbackTrialOffer, trialAvailable: true, variationId: '' };

const offerFor = (paywall: SubscriptionPaywall): OnboardingOffer => ({
  arm: 'a',
  assigned: 'a',
  source: 'adapty',
  offer: paywallTrialOffer(paywall.products),
  trialAvailable: paywall.products.some((product) => product.offerLabel !== null),
  variationId: paywall.flowVariationId,
});

export function createOnboardingOffer(deps: {
  subscription: SubscriptionPort;
  analytics: AnalyticsPort;
  identityGeneration(): number;
}): OnboardingOfferPort {
  let identity: number | null = null;
  let paywall: SubscriptionPaywall | null = null;
  let locked: OnboardingOffer | null = null;
  let loading: Promise<SubscriptionPaywall> | null = null;
  let exposed = false;
  const reset = () => {
    identity = null;
    paywall = null;
    locked = null;
    loading = null;
    exposed = false;
  };
  const sync = () => {
    if (identity !== null && identity !== deps.identityGeneration()) reset();
  };
  const load = () => {
    sync();
    if (paywall) return Promise.resolve(paywall);
    if (!loading) {
      identity = deps.identityGeneration();
      loading = deps.subscription.loadPaywall('onboarding').then((next) => {
        paywall = next;
        return next;
      }).finally(() => { loading = null; });
    }
    return loading;
  };
  const freeze = (): OnboardingOffer => {
    sync();
    if (!locked) locked = paywall ? offerFor(paywall) : unloaded;
    return locked;
  };
  return {
    reset,
    resume(offer) {
      sync();
      if (!locked) locked = offer;
    },
    snapshot() {
      sync();
      return locked ?? (paywall ? offerFor(paywall) : unloaded);
    },
    freeze,
    prefetch() {
      return load().then(() => undefined, () => undefined);
    },
    loadPaywall() {
      return load();
    },
    expose() {
      sync();
      if (exposed) return;
      const offer = freeze();
      exposed = true;
      deps.analytics.track('onboarding_offer_exposed', {
        arm: offer.arm,
        assigned_arm: offer.assigned,
        source: offer.source,
        intro_offer: offer.variationId ? (offer.trialAvailable ? 'available' : 'unavailable') : 'unknown',
        variation_id: offer.variationId || undefined,
      });
    },
  };
}
