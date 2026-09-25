import { base } from './base';
export const scenario1 = base('onboarding-walking-resume', 'Resume walking setup', {
  onboarding: 'resumeAt:W3',
  rules: [],
  entitlement: { status: 'none', renewsAt: null },
});
