import { base } from './base';

const setup = {
  onboarding: 'resumeAt:S3b' as const,
  rules: [],
  entitlement: { status: 'none' as const, renewsAt: null },
};
export const conditionDemoScenarios = [
  base('condition-demo-walk-steps', 'Condition demo · walking steps', {
    ...setup, onboardingAnswers: { activity: 'walking', walkingMode: 'steps', stepGoal: 10000 },
    profile: { walkPlaces: ['outside'] },
  }),
  base('condition-demo-walk-minutes', 'Condition demo · walking minutes', {
    ...setup, onboardingAnswers: { activity: 'walking', walkingMode: 'minutes', walkMinutes: 20 },
    profile: { walkPlaces: ['outside'] },
  }),
  base('condition-demo-walk-state-outside', 'Condition demo · walking state outdoors', {
    ...setup, onboardingAnswers: { activity: 'walking', walkingMode: 'state' },
    profile: { walkPlaces: ['outside'] },
  }),
  base('condition-demo-walk-state-treadmill', 'Condition demo · walking state treadmill', {
    ...setup, onboardingAnswers: { activity: 'walking', walkingMode: 'state' },
    profile: { walkPlaces: ['treadmill'] },
  }),
  base('condition-demo-gym-arrival', 'Condition demo · gym arrival', {
    ...setup, onboardingAnswers: { activity: 'gym', gymMode: 'arrival' },
  }),
  base('condition-demo-gym-presence', 'Condition demo · gym presence', {
    ...setup, onboardingAnswers: { activity: 'gym', gymMode: 'presence' },
  }),
  base('condition-demo-gym-minutes', 'Condition demo · gym minutes', {
    ...setup, onboardingAnswers: { activity: 'gym', gymMode: 'time', gymMinutes: 30 },
  }),
];
