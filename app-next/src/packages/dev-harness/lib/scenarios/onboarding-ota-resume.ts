import { base } from './base';

const answered = { name: 'Alex', gender: 'male', referralSource: 'friend', ageBand: '25–34', improveFirst: 'screenTime', estimatedDailyMinutes: 180 };
const opening = ['O01', 'O02', 'O03', 'O07', 'O04', 'O05', 'O06', 'O08', 'O22'];

export const onboardingOtaResumeScenarios = [
  base('onboarding-unknown-page-resume', 'Resume after a saved page was renamed', {
    onboarding: 'resumeAt:old-question',
    otaResumeRoute: '/onboarding/old-question',
    otaOnboardingResume: true,
    onboardingAnswers: { ...answered, bodyGoal: ['gain', 'lose'] },
    onboardingCheckpoint: { started: true, completedSteps: opening, seenSteps: opening },
  }),
  base('onboarding-prerequisite-resume', 'Resume at the missing activity choice before a walking page', {
    onboarding: 'resumeAt:W2',
    otaResumeRoute: '/onboarding/W2',
    otaOnboardingResume: true,
    onboardingAnswers: { ...answered, bodyGoal: 'maintain', currentDailySteps: 7500 },
    onboardingCheckpoint: { started: true, completedSteps: [...opening, 'O10', 'O11', 'O12', 'O13', 'O14', 'O15', 'O16', 'O17', 'O18', 'O20', 'W0', 'W1'], seenSteps: opening },
  }),
];
