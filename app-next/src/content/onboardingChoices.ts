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
  O07: {
    key: 'occupation',
    options: [
      'Software developer',
      'Founder',
      'Remote worker',
      'Finance or accounting',
      'Architecture',
      'Education',
      'Other',
    ].map((title) => ({ id: title, title })),
  },
  O08: {
    key: 'improveFirst',
    options: [
      { id: 'exercise', title: 'More exercise', icon: 'walking' },
      { id: 'screenTime', title: 'Less screen time', icon: 'lock' },
      { id: 'wellness', title: 'Overall wellness', icon: 'heart' },
    ],
  },
  O09: {
    key: 'mainReason',
    options: [
      { id: 'confidence', title: 'Feel more confident', icon: 'star' },
      { id: 'energy', title: 'Have more energy', icon: 'flame' },
      { id: 'focus', title: 'Focus on what matters', icon: 'list' },
      { id: 'fitness', title: 'Feel stronger and healthier', icon: 'gym' },
      { id: 'presence', title: 'Be more present', icon: 'heart' },
      { id: 'consistency', title: 'Keep a promise to myself', icon: 'check' },
    ],
  },
};
