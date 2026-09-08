import { Entitlement } from '../domain/types';
import { Unsubscribe } from './models';
export type TrialOffer = { trialDays: number; reminderDaysBefore: number; label: string };
export type SubscriptionEntitlement = Entitlement & { offer: TrialOffer };
export type SubscriptionPlacement = 'onboarding' | 'in_app';
export type SubscriptionPlan = 'annual' | 'monthly';
export interface SubscriptionPort {
  entitlement(): SubscriptionEntitlement;
  presentPaywall(placement: SubscriptionPlacement, plan: SubscriptionPlan): Promise<Entitlement>;
  restore(): Promise<Entitlement>;
  identify(userId: string): void;
  reset(): void;
  subscribe(callback: (entitlement: Entitlement) => void): Unsubscribe;
}
