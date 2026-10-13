import type { SubscriptionPaywall, TrialOffer } from './SubscriptionPort';

export type OnboardingOffer = {
  arm: 'a' | 'b';
  source: 'adapty' | 'fallback';
  offer: TrialOffer;
  trialAvailable: boolean;
  variationId: string;
};

export interface OnboardingOfferPort {
  prefetch(): Promise<void>;
  freeze(keepTrialScreens?: boolean): OnboardingOffer;
  snapshot(): OnboardingOffer;
  loadPaywall(): Promise<SubscriptionPaywall>;
  expose(): void;
  reset(): void;
}
