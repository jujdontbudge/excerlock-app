import { base } from './base';

const onboarding = {
  onboarding: 'resumeAt:S3b' as const,
  rules: [],
  entitlement: { status: 'none' as const, renewsAt: null },
  onboardingAnswers: { gender: 'female', bodyGoal: 'lose', activity: 'walking', walkingMode: 'steps', stepGoal: 10000, days: [1, 2, 3, 4, 5], allDay: true },
  identityLab: {},
  fakeSystemPrompts: 'grant' as const,
};

const fullOnboarding = {
  ...onboarding,
  onboarding: 'resumeAt:O01' as const,
  onboardingAnswers: {
    ...onboarding.onboardingAnswers,
    name: 'Alex', referralSource: 'instagram', ageBand: '25–34', improveFirst: 'exercise',
    bodyGoal: ['lose'], fatLossLb: 15, estimatedDailyMinutes: 180, currentDailySteps: 2500,
  },
};

export const onboardingOfferScenarios = [
  base('onboarding-offer-a-full', 'Trial A · complete onboarding', { ...fullOnboarding, onboardingOffer: { arm: 'a' } }),
  base('onboarding-offer-b-full', 'No trial B · complete onboarding', { ...fullOnboarding, onboardingOffer: { arm: 'b' } }),
  base('onboarding-offer-a', 'onboarding-offer-a', { ...onboarding, onboardingOffer: { arm: 'a' } }),
  base('onboarding-offer-b', 'onboarding-offer-b', { ...onboarding, onboardingOffer: { arm: 'b' } }),
  base('onboarding-offer-unknown', 'onboarding-offer-unknown', { ...onboarding, onboardingOffer: { arm: 'unknown' } }),
  base('onboarding-offer-late', 'onboarding-offer-late', { ...onboarding, onboardingOffer: { arm: 'late' } }),
  base('onboarding-offer-error', 'onboarding-offer-error', { ...onboarding, onboardingOffer: { arm: 'error' } }),
  base('onboarding-offer-malformed', 'onboarding-offer-malformed', { ...onboarding, onboardingOffer: { arm: 'malformed' } }),
  base('onboarding-offer-ineligible', 'onboarding-offer-ineligible', { ...onboarding, onboardingOffer: { arm: 'a', introEligible: false } }),
  base('onboarding-offer-six-days', 'onboarding-offer-six-days', { ...onboarding, onboardingOffer: { arm: 'a', trialDays: 6 } }),
  base('onboarding-offer-seven-days', 'Trial A · current one-week catalog', { ...onboarding, onboardingOffer: { arm: 'a', trialDays: 7 } }),
  base('onboarding-offer-fallback-error', 'onboarding-offer-fallback-error', { ...onboarding, onboardingOffer: { arm: 'error', fallbackError: true } }),
  base('trial-reminder-three-days', 'Trial reminder · day two', {
    entitlement: { status: 'trial', renewsAt: '2026-09-10T15:00:00.000Z', accessExpiresAt: '2026-09-10T15:00:00.000Z' },
  }),
  base('trial-reminder-too-late', 'Trial reminder · past reminder', {
    entitlement: { status: 'trial', renewsAt: '2026-09-08T14:00:00.000Z', accessExpiresAt: '2026-09-08T14:00:00.000Z' },
  }),
];
