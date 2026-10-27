import { base } from './base';
import { emptyPermissions } from '../../../permissions/permissionsStore';

const atOnboardingPaywall = {
  onboarding: 'resumeAt:P' as const,
  onboardingAnswers: {
    ruleId: 'identity-lab-staged-condition',
    ruleCreatedAt: '2026-09-07T15:00:00.000Z',
    ruleCommitted: false,
    ruleCommittedFor: '',
  },
  permissions: emptyPermissions,
  lockedApps: { handle: null, isEmpty: true },
  ruleDays: [],
  entitlement: { status: 'none' as const, renewsAt: null },
  history: [],
  usageMinutesToday: null,
  steps: { today: 0 },
};
export const identityLabScenarios = [
  base('identity-lab-restore-transport', 'Identity lab · restore transport failure', {
    ...atOnboardingPaywall,
    identityLab: { productionAnalytics: true, restore: 'transport' },
  }),
  base('identity-lab-restore-auth', 'Identity lab · restore authentication failure', {
    ...atOnboardingPaywall,
    identityLab: { productionAnalytics: true, restore: 'auth' },
  }),
  base('identity-lab-restore-unverified', 'Identity lab · restore verification failure', {
    ...atOnboardingPaywall,
    identityLab: { productionAnalytics: true, restore: 'unverified' },
  }),
  base('identity-lab-checkout-no-sheet', 'Identity lab · cancellation without an inactive observation', {
    ...atOnboardingPaywall,
    identityLab: { productionAnalytics: true, purchase: 'cancel', checkoutSheet: 'none' },
  }),
  base('identity-lab-checkout-analytics-throw', 'Identity lab · checkout analytics throw', {
    ...atOnboardingPaywall,
    identityLab: { productionAnalytics: true, checkoutAnalyticsFailure: 'throw' },
  }),
  base('identity-lab-checkout-analytics-reject', 'Identity lab · checkout analytics rejection', {
    ...atOnboardingPaywall,
    identityLab: { productionAnalytics: true, checkoutAnalyticsFailure: 'reject' },
  }),
  base('identity-lab-checkout-analytics-hang', 'Identity lab · checkout analytics hang', {
    ...atOnboardingPaywall,
    identityLab: { productionAnalytics: true, checkoutAnalyticsFailure: 'hang' },
  }),
  base('identity-lab-payment-analytics', 'Identity lab · production payment analytics', {
    ...atOnboardingPaywall,
    identityLab: { productionAnalytics: true, purchase: 'cancel' },
  }),
  base('identity-lab-apple-unknown', 'Identity lab · Apple unknown error then cancel and retry', {
    ...atOnboardingPaywall,
    identityLab: { appleUnknown: true, providerAttempts: true },
  }),
  base('identity-lab-account-isolation', 'Identity lab · account data isolation', {
    ...atOnboardingPaywall,
    identityLab: { googleSignIn: 'success' },
  }),
  base('identity-lab-user-sync-failed', 'Identity lab · user sync fails once', {
    ...atOnboardingPaywall,
    identityLab: { userSync: 'failFirst' },
  }),
  base('identity-lab-slow-cold-start', 'Identity lab · slow user sync', {
    ...atOnboardingPaywall,
    identityLab: { userSync: 'slow' },
  }),
  base('identity-lab-anonymous-failed', 'Identity lab · anonymous sign-in fails once', {
    ...atOnboardingPaywall,
    identityLab: { anonymousSignIn: 'failFirst' },
  }),
  base('identity-lab-plans-failed', 'Identity lab · plans fail once', {
    ...atOnboardingPaywall,
    identityLab: { plans: 'failFirst' },
  }),
  base('identity-lab-purchase-cancelled', 'Identity lab · purchase cancelled', {
    ...atOnboardingPaywall,
    identityLab: { userSync: 'failFirst', purchase: 'cancel' },
  }),
  base('identity-lab-purchase-error-retry', 'Identity lab · purchase error then retry', {
    ...atOnboardingPaywall,
    identityLab: { userSync: 'failFirst', purchase: 'errorFirst' },
  }),
  base('identity-lab-purchase-pending', 'Identity lab · purchase pending', {
    ...atOnboardingPaywall,
    identityLab: { userSync: 'failFirst', purchase: 'pending' },
  }),
  base('identity-lab-purchase-success-without-access', 'Identity lab · purchase succeeds without premium access', {
    ...atOnboardingPaywall,
    identityLab: { userSync: 'failFirst', purchase: 'successWithoutAccess' },
  }),
  base('identity-lab-purchase-busy', 'Identity lab · purchase input serialization', {
    ...atOnboardingPaywall,
    identityLab: { userSync: 'failFirst', purchase: 'busyBarrier' },
  }),
  base('identity-lab-existing-subscription', 'Identity lab · existing store subscription checkout', {
    ...atOnboardingPaywall,
    identityLab: { userSync: 'failFirst', purchase: 'alreadyOwned', restore: 'restored' },
  }),
  base('identity-lab-restore-wrong-store', 'Identity lab · wrong Store account restore', {
    ...atOnboardingPaywall,
    identityLab: { userSync: 'failFirst', restore: 'notFound', wrongStoreAccount: true },
  }),
  base('identity-lab-restore-error-retry', 'Identity lab · restore error then retry', {
    ...atOnboardingPaywall,
    identityLab: { userSync: 'failFirst', restore: 'errorFirst' },
  }),
  base('identity-lab-integration-failed', 'Identity lab · attribution identifier fails before checkout', {
    ...atOnboardingPaywall,
    identityLab: { integrationIdentifier: 'networkFailed' },
  }),
  base('identity-lab-integration-hangs', 'Identity lab · attribution identifier never answers', {
    ...atOnboardingPaywall,
    identityLab: { integrationIdentifier: 'hang' },
  }),
  base('identity-lab-provider-attempts', 'Identity lab · provider attempt resilience', {
    ...atOnboardingPaywall,
    identityLab: { googleSignIn: 'success', providerAttempts: true },
  }),
  base('identity-lab-save', 'Identity lab · guest saves the account', {
    ...atOnboardingPaywall,
    identityLab: { googleSignIn: 'success' },
  }),
  base('identity-lab-existing-apple', 'Identity lab · Apple ID belongs to an existing paid account', {
    ...atOnboardingPaywall,
    identityLab: { existing: { provider: 'apple', paid: true } },
  }),
  base('identity-lab-existing-email', 'Identity lab · email belongs to an existing paid account', {
    ...atOnboardingPaywall,
    identityLab: { existing: { provider: 'email', paid: true } },
  }),
  base('identity-lab-email-rate-limited', 'Identity lab · rate limited email code', {
    ...atOnboardingPaywall,
    identityLab: { emailRateLimited: true },
  }),
];
