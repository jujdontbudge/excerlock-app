import { Entitlement } from '../model/types';
import { Unsubscribe } from '../model/models';
export type TrialOffer = { trialDays: number; reminderDaysBefore: number; label: string };
export type SubscriptionEntitlement = Entitlement & { offer: TrialOffer };
export type SubscriptionOperation = { busy: boolean; pending: boolean; error: string | null };
export type PaywallProduct = {
  handle: string;
  vendorProductId: string;
  title: string;
  detail: string;
  localizedPrice: string;
  localizedPeriod: string;
  localizedWeeklyPrice: string | null;
  localizedMonthlyPrice: string | null;
  priceAmount: number | null;
  periodUnit: string | null;
  offerLabel: string | null;
  trialOffer?: TrialOffer | null;
  recommended: boolean;
};
export type SubscriptionPaywall = {
  placement: 'onboarding' | 'in_app' | 'winback' | 'close_offer';
  title: string;
  body: string;
  flowVariationId: string;
  products: readonly PaywallProduct[];
  generation: number;
  trial?: boolean;
};
export type PurchaseResult =
  | { type: 'success'; entitlement: Entitlement }
  | { type: 'user_cancelled' | 'pending' | 'already_subscribed' };
export interface SubscriptionPort {
  entitlement(): SubscriptionEntitlement;
  restore(context?: { placement: SubscriptionPaywall['placement'] }): Promise<Entitlement>;
  identify(userId: string): Promise<void>;
  reset(): Promise<void>;
  refresh(): Promise<Entitlement>;
  loadPaywall(placement: SubscriptionPaywall['placement']): Promise<SubscriptionPaywall>;
  logPaywallShown(generation: number): Promise<void>;
  purchase(handle: string): Promise<PurchaseResult>;
  operation(): SubscriptionOperation;
  manageSubscription(): Promise<void>;
  subscribe(callback: (entitlement: Entitlement) => void): Unsubscribe;
}
