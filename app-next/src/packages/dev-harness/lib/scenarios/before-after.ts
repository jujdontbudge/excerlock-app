import { base } from './base';

const setup = {
  onboarding: 'resumeAt:S3e' as const,
  rules: [],
  entitlement: { status: 'none' as const, renewsAt: null },
};
export const beforeAfterScenarios = [
  base('before-after-girl-gym', 'Before and After · girl, gym, lose weight', {
    ...setup, onboardingAnswers: { gender: 'female', bodyGoal: 'lose', activity: 'gym', gymMode: 'arrival' },
  }),
  base('before-after-girl-walk', 'Before and After · girl, walking, build muscle', {
    ...setup, onboardingAnswers: { gender: 'female', bodyGoal: 'gain', activity: 'walking', walkingMode: 'steps', stepGoal: 10000 },
    profile: { walkPlaces: ['outside'] },
  }),
];
