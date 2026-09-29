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
  base('identity-lab-purchase-pending', 'Identity lab · purchase pending', {
    ...atOnboardingPaywall,
    identityLab: { userSync: 'failFirst', purchase: 'pending' },
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
  base('identity-lab-concurrent-restore', 'Identity lab · concurrent established account restores', {
    ...atOnboardingPaywall,
    identityLab: { googleSignIn: 'success', concurrentRestore: true },
  }),
  base('identity-lab-local-signout', 'Identity lab · local sign-out with peer session', {
    ...atOnboardingPaywall,
    identityLab: { localSignOut: true },
  }),
  base('identity-lab-established-provider-conflict', 'Identity lab · established provider conflict', {
    ...atOnboardingPaywall,
    identityLab: { googleSignIn: 'success', establishedProviderConflict: true },
  }),
  base('identity-lab-apple-linked', 'Identity lab · Apple ID already linked', {
    ...atOnboardingPaywall,
    identityLab: { appleLink: 'conflict' },
  }),
];
