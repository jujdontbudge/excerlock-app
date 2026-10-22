import { Entitlement } from '../model/types';
import { Unsubscribe } from '../model/models';
export type TrialOffer = { trialDays: number; reminderDaysBefore: number; label: string };
export type SubscriptionEntitlement = Entitlement & { offer: TrialOffer };
export type SubscriptionOperation = { busy: boolean; pending: boolean; error: string | null };
export type StorePurchase = { originalTransactionId: string; isSandbox: boolean };
export type PurchaseRecovery =
  | { type: 'none' }
  | {
      type: 'pending';
      operation: 'purchase' | 'restore';
      operationId: string;
      checkoutUserId: string;
      startedAt: string;
      storePurchase?: StorePurchase;
    }
  | {
      type: 'accountConnection';
      operation: 'purchase' | 'restore';
      operationId: string;
      checkoutUserId: string;
      startedAt: string;
      confirmedAt: string;
      storePurchase?: StorePurchase;
    };
export type PaywallProduct = {
  handle: string;
  vendorProductId: string;
  title: string;
  detail: string;
  localizedPrice: string;
  localizedPeriod: string;
  localizedWeeklyPrice: string | null;
  periodUnit: string | null;
  offerLabel: string | null;
  trialOffer?: TrialOffer | null;
  recommended: boolean;
};
export type SubscriptionPaywall = {
  placement: 'onboarding' | 'in_app' | 'winback';
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
export type StoreEnvironment = 'production' | 'sandbox';
export type SubscriptionAdmissionLease = {
  source?: 'complimentary';
  userId: string;
  generation: number;
  environment: StoreEnvironment;
  expiresAt: string;
  observedAt: string;
  verifiedAt: string;
};
export type SubscriptionAdmissionResult =
  | { type: 'eligible'; lease: SubscriptionAdmissionLease }
  | { type: 'ineligible' }
  | { type: 'unavailable'; reason?: SubscriptionVerificationFailure };
export type SubscriptionVerificationFailure =
  | 'store_environment_unavailable'
  | 'identity_not_ready'
  | 'identity_timeout'
  | 'identity_changed'
  | 'auth_unavailable'
  | 'request_timeout'
  | 'request_failed'
  | 'http_error'
  | 'invalid_response'
  | 'account_mismatch'
  | 'environment_mismatch'
  | 'subscription_unknown'
  | 'purchase_recovery'
  | 'verification_failed';
export interface SubscriptionAdmissionPort {
  verify(identity: { userId: string; generation: number }): Promise<SubscriptionAdmissionResult>;
  current(identity: { userId: string; generation: number }): SubscriptionAdmissionLease | null;
  remainingMs(identity: { userId: string; generation: number }): number;
  invalidate(): void;
}
export interface SubscriptionPort {
  entitlement(): SubscriptionEntitlement;
  presentPaywall(placement: string): Promise<Entitlement>;
  restore(context?: { placement: SubscriptionPaywall['placement'] }): Promise<Entitlement>;
  identify(userId: string): Promise<void>;
  reset(): Promise<void>;
  refresh(): Promise<Entitlement>;
  loadPaywall(placement: SubscriptionPaywall['placement'], options?: { onboardingPlacement: 'onboarding_trial_fallback' | 'onboarding_no_trial' }): Promise<SubscriptionPaywall>;
  logPaywallShown(generation: number): Promise<void>;
  purchase(handle: string): Promise<PurchaseResult>;
  operation(): SubscriptionOperation;
  recovery(): PurchaseRecovery;
  recoveryReady(): Promise<void>;
  clearRecovery(): Promise<void>;
  subscribeRecovery(callback: (recovery: PurchaseRecovery) => void): Unsubscribe;
  manageSubscription(): Promise<void>;
  subscribe(callback: (entitlement: Entitlement) => void): Unsubscribe;
}
