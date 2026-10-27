import { base } from './base';
import { emptyPermissions } from '../../../permissions/permissionsStore';

const onboarding = {
  onboarding: 'resumeAt:S3b' as const,
  rules: [],
  entitlement: { status: 'none' as const, renewsAt: null },
  onboardingAnswers: { gender: 'female', bodyGoal: 'lose', activity: 'walking', walkingMode: 'steps', stepGoal: 10000, days: [1, 2, 3, 4, 5], allDay: true },
  fakeSystemPrompts: 'grant' as const,
};
const trialOffer = { ...onboarding, identityLab: {}, onboardingOffer: { arm: 'a' as const } };
const paidOffer = { ...onboarding, identityLab: {}, onboardingOffer: { arm: 'b' as const } };
const atPaywall = {
  onboarding: 'resumeAt:P' as const,
  onboardingAnswers: { ruleId: 'ad-staged-condition', ruleCreatedAt: '2026-09-07T15:00:00.000Z', ruleCommitted: false, ruleCommittedFor: '' },
  permissions: emptyPermissions,
  lockedApps: { handle: null, isEmpty: true },
  ruleDays: [],
  entitlement: { status: 'none' as const, renewsAt: null },
  history: [],
  usageMinutesToday: null,
  steps: { today: 0 },
};

export const adAttributionScenarios = [
  base('ads-trial-allowed', 'Ads · trial, tracking allowed', { ...trialOffer, ads: { answer: 'granted' } }),
  base('ads-registration-sent-before', 'Ads · onboarding already counted on this install', {
    ...trialOffer, ads: { answer: 'granted', sentBefore: [['registration', 'install']] },
  }),
  base('ads-trial-denied', 'Ads · trial, tracking denied', { ...trialOffer, ads: { answer: 'denied' } }),
  base('ads-paid-no-trial', 'Ads · paid start without a trial', { ...paidOffer, ads: { answer: 'granted' } }),
  base('ads-paid-after-trial', 'Ads · paid re-purchase after an already counted trial', {
    ...paidOffer, ads: { answer: 'granted', sentBefore: [['start_trial', 'transaction', 'lab-original-1']] },
  }),
  base('ads-trial-ineligible', 'Ads · trial already used, pays', { ...onboarding, identityLab: {}, onboardingOffer: { arm: 'a', introEligible: false }, ads: { answer: 'granted' } }),
  base('ads-trial-sent-before', 'Ads · same store subscription already counted', {
    ...trialOffer, ads: { answer: 'granted', sentBefore: [['start_trial', 'transaction', 'lab-original-1']] },
  }),
  base('ads-other-account-sent', 'Ads · another account on this phone already counted', {
    ...trialOffer,
    identityLab: { storeTransaction: { originalTransactionId: 'lab-original-2', environment: 'Sandbox' } },
    ads: { answer: 'granted', sentBefore: [['start_trial', 'account', 'lab-user-a'], ['start_trial', 'transaction', 'lab-original-1']] },
  }),
  base('ads-xcode-purchase', 'Ads · Xcode StoreKit test purchase', {
    ...trialOffer, identityLab: { storeTransaction: { originalTransactionId: 'lab-original-1', environment: 'Xcode' } }, ads: { answer: 'granted' },
  }),
  base('ads-duplicate-callbacks', 'Ads · purchase result plus two profile callbacks', {
    ...trialOffer, identityLab: { duplicatePurchaseCallback: true }, ads: { answer: 'granted' },
  }),
  base('ads-sdk-start-fails', 'Ads · both SDKs fail to start', { ...trialOffer, ads: { answer: 'granted', failure: 'start' } }),
  base('ads-sdk-log-fails', 'Ads · both SDKs throw on every event', { ...trialOffer, ads: { answer: 'granted', failure: 'send' } }),
  base('ads-unconfigured', 'Ads · placeholder credentials', { ...trialOffer, ads: { unconfigured: true } }),
  base('ads-restore', 'Ads · restore an existing trial', {
    ...atPaywall,
    identityLab: { storeGrant: { owner: 'lab-user-a', status: 'trial' }, restore: 'restored' },
    ads: { tracking: 'granted' },
  }),
  base('ads-purchase-cancelled', 'Ads · purchase cancelled', { ...atPaywall, identityLab: { purchase: 'cancel' }, ads: { tracking: 'granted' } }),
  base('ads-purchase-pending', 'Ads · Ask to Buy pending', { ...atPaywall, identityLab: { purchase: 'pending' }, ads: { tracking: 'granted' } }),
  base('ads-purchase-error', 'Ads · purchase fails', { ...atPaywall, identityLab: { purchase: 'error' }, ads: { tracking: 'granted' } }),
];
