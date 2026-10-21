import { base } from './base';
export const scenario1 = base('onboarding-walking-resume', 'Resume walking setup', {
  onboarding: 'resumeAt:W3',
  rules: [],
  entitlement: { status: 'none', renewsAt: null },
});
export const legacyPaywallReset = base('onboarding-legacy-paywall-reset', 'Older Paywall exit replaying Onboarding', {
  onboarding: 'resumeAt:O01',
  rules: [],
  entitlement: { status: 'none', renewsAt: null },
  onboardingAnswers: { name: 'Jordan', ruleId: 'legacy-plan', ruleCreatedAt: '2026-09-07T15:00:00.000Z', ruleCommitted: false },
});
