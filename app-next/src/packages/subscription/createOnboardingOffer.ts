import type { OnboardingOffer, OnboardingOfferPort } from '../ports/OnboardingOfferPort';
import type { AnalyticsPort } from '../ports/AnalyticsPort';
import type { SubscriptionPaywall, SubscriptionPort } from '../ports/SubscriptionPort';
import { fallbackTrialOffer, paywallTrialOffer } from './trialOffer';

const noTrialPlans = [
  'com.johansardar.excerlock.premium.a.monthly.notrial',
  'com.johansardar.excerlock.premium.a.annual.notrial',
];
const fallback = (assigned: 'a' | 'b'): OnboardingOffer => ({ arm: 'a', assigned, source: 'fallback', offer: fallbackTrialOffer, trialAvailable: true, variationId: '' });

const twins = (paywall: SubscriptionPaywall) => paywall.products.length === 2
  && noTrialPlans.every((id) => paywall.products.some((product) => product.vendorProductId === id && !product.offerLabel));

const plainOnly = (paywall: SubscriptionPaywall) => paywall.products.length > 0
  && paywall.products.every((product) => !product.offerLabel && !product.trialOffer);

function armFor(paywall: SubscriptionPaywall, assigned: 'a' | 'b'): 'a' | 'b' | null {
  if ((assigned === 'b' || paywall.trial === false) && (twins(paywall) || plainOnly(paywall))) return 'b';
  if (paywall.trial === false) return null;
  return paywall.products.some((product) => !noTrialPlans.includes(product.vendorProductId)) ? 'a' : null;
}

export function assignedArm(installId: string): 'a' | 'b' {
  if (!installId) return 'a';
  let hash = 0x811c9dc5;
  for (const char of `onboarding_trial_offer:${installId}`) hash = Math.imul(hash ^ char.charCodeAt(0), 0x01000193) >>> 0;
  return hash % 100 < 50 ? 'b' : 'a';
}

export function createOnboardingOffer(deps: {
  subscription: SubscriptionPort;
  analytics: AnalyticsPort;
  identityGeneration(): number;
  installId(): string;
}): OnboardingOfferPort {
  let assignment: 'a' | 'b' | null = null;
  const assigned = () => {
    if (assignment) return assignment;
    try { assignment = assignedArm(deps.installId()); } catch { assignment = 'a'; }
    return assignment;
  };
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
    assignment = null;
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
    const arm = candidate ? armFor(candidate, assigned()) : null;
    if (candidate && arm && (!keepTrialScreens || (arm === 'a' && candidate.products.some((product) => product.offerLabel)))) {
      retained = candidate;
      locked = {
        arm,
        assigned: assigned(),
        source: typeof candidate.trial === 'boolean' || arm === 'b' ? 'adapty' : 'fallback',
        offer: paywallTrialOffer(candidate.products),
        trialAvailable: arm === 'a' && candidate.products.some((product) => product.offerLabel !== null),
        variationId: candidate.flowVariationId,
      };
    } else locked = fallback(assigned());
    return locked;
  };
  return {
    reset,
    snapshot() { syncIdentity(); return locked ?? fallback(assigned()); },
    freeze,
    prefetch() {
      syncIdentity();
      if (locked || candidate) return Promise.resolve();
      if (prefetching) return prefetching;
      const started = epoch;
      prefetching = (assigned() === 'b'
        ? deps.subscription.loadPaywall('onboarding', { onboardingPlacement: 'onboarding_no_trial' })
        : deps.subscription.loadPaywall('onboarding')).then((paywall) => {
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
      loading = deps.subscription.loadPaywall('onboarding', { onboardingPlacement: 'onboarding_trial_fallback' }).then((paywall) => {
        if (started !== epoch || armFor(paywall, 'a') !== 'a') throw new Error('Onboarding trial plans unavailable');
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
        assigned_arm: offer.assigned,
        source: offer.source,
        intro_offer: offer.variationId ? (offer.trialAvailable ? 'available' : 'unavailable') : 'unknown',
        variation_id: offer.variationId || undefined,
      });
    },
  };
}
