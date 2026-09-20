import { IconName } from '../icons/paths';
export type OnboardingChoice = { id: string; title: string; icon?: IconName };
export const choiceQuestions: { [step: string]: { key: string; options: OnboardingChoice[] } } = {
  O05: {
    key: 'referralSource',
    options: [
      { id: 'youtube', title: 'YouTube' },
      { id: 'instagram', title: 'Instagram' },
      { id: 'tiktok', title: 'TikTok' },
      { id: 'appStore', title: 'App Store' },
      { id: 'friend', title: 'Friends' },
      { id: 'other', title: 'Other' },
    ],
  },
  O06: {
    key: 'ageBand',
    options: ['Under 18', '18–24', '25–34', '35–44', '45–54', '55–64', '65+'].map((title) => ({ id: title, title })),
  },
  O08: {
    key: 'improveFirst',
    options: [
      { id: 'exercise', title: 'More exercise', icon: 'walking' },
      { id: 'screenTime', title: 'Less screen time', icon: 'lock' },
      { id: 'wellness', title: 'Overall wellness', icon: 'heart' },
      { id: 'other', title: 'Something else', icon: 'more' },
    ],
  },
  O21: {
    key: 'exercisePreference',
    options: [
      { id: 'walking', title: 'Walking', icon: 'walking' },
      { id: 'lifting', title: 'Lifting', icon: 'gym' },
      { id: 'pilates', title: 'Pilates', icon: 'person' },
      { id: 'yoga', title: 'Yoga', icon: 'heart' },
      { id: 'running', title: 'Running', icon: 'flame' },
      { id: 'cycling', title: 'Cycling', icon: 'clock' },
      { id: 'swimming', title: 'Swimming', icon: 'person' },
      { id: 'other', title: 'Something else', icon: 'more' },
    ],
  },
  O07: {
    key: 'gender',
    options: [
      { id: 'male', title: 'Male', icon: 'person' },
      { id: 'female', title: 'Female', icon: 'person' },
      { id: 'other', title: 'Other', icon: 'person' },
      { id: 'preferNotToSay', title: 'Prefer not to say', icon: 'more' },
    ],
  },
  O22: {
    key: 'bodyGoal',
    options: [
      { id: 'gain', title: 'Gain weight', icon: 'gym' },
      { id: 'lose', title: 'Lose weight', icon: 'flame' },
      { id: 'maintain', title: 'Maintain', icon: 'heart' },
    ],
  },
  O09: {
    key: 'weeklyExerciseHours',
    options: [
      { id: 'none', title: 'None yet' },
      { id: 'under-1', title: 'Less than 1 hour' },
      { id: '1-2', title: '1–2 hours' },
      { id: '3-4', title: '3–4 hours' },
      { id: '5-6', title: '5–6 hours' },
      { id: '7-plus', title: '7+ hours' },
    ],
  },
};
