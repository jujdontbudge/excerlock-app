import { base } from './base';
import { emptyPermissions } from '../../../permissions/permissionsStore';

const atOnboardingPaywall = {
  onboarding: 'resumeAt:P' as const,
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
  base('identity-lab-apple-linked', 'Identity lab · Apple ID already linked', {
    ...atOnboardingPaywall,
    identityLab: { appleLink: 'conflict' },
  }),
];
