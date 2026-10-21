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
  base('identity-lab-payment-analytics', 'Identity lab · production payment analytics', {
    ...atOnboardingPaywall,
    identityLab: { productionAnalytics: true, purchase: 'cancel' },
  }),
  base('identity-lab-purchase-preflight', 'Identity lab · retry purchase preflight', {
    ...atOnboardingPaywall,
    identityLab: { activation: 'failFirst', adaptyIdentify: 'failFirst', audienceUpdate: 'fail', plans: 'failFirst', journalFailure: 'hydrateOnce' },
  }),
  base('identity-lab-purchase-response-interrupted', 'Identity lab · payment response interrupted', {
    ...atOnboardingPaywall,
    identityLab: { purchase: 'paidThenInterrupted', restore: 'restored' },
  }),
  base('identity-lab-purchase-response-encoding', 'Identity lab · payment response encoding failed', {
    ...atOnboardingPaywall,
    identityLab: { purchase: 'paidThenEncodingFailed', restore: 'restored' },
  }),
  base('identity-lab-purchase-journal-confirm', 'Identity lab · journal confirmation fails once', {
    ...atOnboardingPaywall,
    identityLab: { journalFailure: 'confirmOnce', restore: 'restored' },
  }),
  base('identity-lab-purchase-journal-clear', 'Identity lab · journal removal fails once', {
    ...atOnboardingPaywall,
    identityLab: { purchase: 'cancel', journalFailure: 'clearOnce', restore: 'notFound' },
  }),
  base('identity-lab-email-new', 'Identity lab · new email account after purchase', {
    ...atOnboardingPaywall,
    identityLab: { emailAccount: 'new', restore: 'restored' },
  }),
  base('identity-lab-email-existing', 'Identity lab · existing email account after purchase', {
    ...atOnboardingPaywall,
    identityLab: { emailAccount: 'existing', restore: 'restored' },
  }),
  base('identity-lab-email-paid', 'Identity lab · existing paid email account after purchase', {
    ...atOnboardingPaywall,
    identityLab: { emailAccount: 'paid', restore: 'restored' },
  }),
  base('identity-lab-email-rate-limited', 'Identity lab · rate limited email code', {
    ...atOnboardingPaywall,
    identityLab: { emailAccount: 'existing', emailRateLimited: true },
  }),
  base('identity-lab-apple-unknown', 'Identity lab · Apple unknown error then cancel and retry', {
    ...atOnboardingPaywall,
    identityLab: { appleUnknown: true, providerAttempts: true },
    subscriptionProof: 'ineligible',
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
  base('identity-lab-stale-product-handle', 'Identity lab · stale product handle after account switch', {
    ...atOnboardingPaywall,
    identityLab: { googleSignIn: 'success', staleProductHandle: true },
  }),
  base('identity-lab-restore-wrong-store', 'Identity lab · wrong Store account restore', {
    ...atOnboardingPaywall,
    identityLab: { userSync: 'failFirst', restore: 'notFound', wrongStoreAccount: true },
    subscriptionProof: 'ineligible',
  }),
  base('identity-lab-restore-error-retry', 'Identity lab · restore error then retry', {
    ...atOnboardingPaywall,
    identityLab: { userSync: 'failFirst', restore: 'errorFirst' },
  }),
  base('identity-lab-independent-restore', 'Identity lab · independent access survives empty restore', {
    ...atOnboardingPaywall,
    identityLab: { googleSignIn: 'success', restore: 'notFound', independentRestore: true },
  }),
  base('identity-lab-passive-entry', 'Identity lab · passive entry does not transfer', {
    ...atOnboardingPaywall,
    identityLab: { googleSignIn: 'success', passiveEntry: true },
  }),
  base('identity-lab-lifecycle-revocation', 'Identity lab · Entitlement revocation while admitted', {
    ...atOnboardingPaywall,
    identityLab: { googleSignIn: 'success', lifecycleRevocation: true },
  }),
  base('identity-lab-purchase-interrupted', 'Identity lab · purchase interrupted before account connection', {
    ...atOnboardingPaywall,
    identityLab: { userSync: 'failFirst', plans: 'empty' },
    purchaseRecovery: 'accountConnection',
  }),
  base('identity-lab-delayed-callbacks', 'Identity lab · delayed purchase and restore callbacks', {
    ...atOnboardingPaywall,
    identityLab: { googleSignIn: 'success', delayedCallbacks: true },
  }),
  base('identity-lab-deletion-callbacks', 'Identity lab · deletion and delayed callbacks', {
    ...atOnboardingPaywall,
    identityLab: { googleSignIn: 'success', delayedCallbacks: true },
    subscriptionProof: 'ineligible',
  }),
  base('identity-lab-established-transfer', 'Identity lab · established account restore transfer', {
    ...atOnboardingPaywall,
    identityLab: { googleSignIn: 'success', establishedTransfer: true },
  }),
  base('identity-lab-transfer-second-subscription', 'Identity lab · transfer with second subscription', {
    ...atOnboardingPaywall,
    identityLab: { googleSignIn: 'success', establishedTransfer: true, secondSubscription: true },
  }),
  base('identity-lab-integration-failed', 'Identity lab · attribution identifier fails before checkout', {
    ...atOnboardingPaywall,
    identityLab: { integrationIdentifier: 'networkFailed' },
  }),
  base('identity-lab-integration-hangs', 'Identity lab · attribution identifier never answers', {
    ...atOnboardingPaywall,
    identityLab: { integrationIdentifier: 'hang' },
  }),
  base('identity-lab-concurrent-restore', 'Identity lab · concurrent established account restores', {
    ...atOnboardingPaywall,
    identityLab: { googleSignIn: 'success', concurrentRestore: true },
  }),
  base('identity-lab-local-signout', 'Identity lab · local sign-out with peer session', {
    ...atOnboardingPaywall,
    identityLab: { localSignOut: true },
  }),
  base('identity-lab-linked-providers', 'Identity lab · linked providers on one account', {
    ...atOnboardingPaywall,
    identityLab: { googleSignIn: 'success', linkedProviders: true },
  }),
  base('identity-lab-provider-attempts', 'Identity lab · provider attempt resilience', {
    ...atOnboardingPaywall,
    identityLab: { googleSignIn: 'success', providerAttempts: true },
    subscriptionProof: 'ineligible',
  }),
  base('identity-lab-email-challenges', 'Identity lab · email code resilience', {
    ...atOnboardingPaywall,
    identityLab: { emailChallenges: true },
    subscriptionProof: 'ineligible',
  }),
  base('identity-lab-established-provider-conflict', 'Identity lab · established provider conflict', {
    ...atOnboardingPaywall,
    identityLab: { googleSignIn: 'success', establishedProviderConflict: true },
  }),
  base('identity-lab-apple-linked', 'Identity lab · Apple ID already linked', {
    ...atOnboardingPaywall,
    identityLab: { appleLink: 'conflict', restore: 'restored' },
  }),
];
