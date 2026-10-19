import { IconName } from '../../ui/paths';
export type OnboardingChoice = { id: string; title: string; icon?: IconName; exclusive?: boolean };
export const choiceQuestions: { [step: string]: { key: string; options: OnboardingChoice[]; multiple?: boolean } } = {
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
  O07: {
    key: 'gender',
    options: [
      { id: 'male', title: 'Male', icon: 'male' },
      { id: 'female', title: 'Female', icon: 'female' },
      { id: 'other', title: 'Other', icon: 'gender-other' },
      { id: 'preferNotToSay', title: 'Prefer not to say', icon: 'more' },
    ],
  },
  O22: {
    key: 'bodyGoal',
    multiple: true,
    options: [
      { id: 'gain', title: 'Gain muscle', icon: 'gym' },
      { id: 'lose', title: 'Lose fat', icon: 'flame' },
      { id: 'maintain', title: 'Maintain', icon: 'heart' },
    ],
  },
  O25: {
    key: 'struggles',
    multiple: true,
    options: [
      { id: 'gain', title: 'Gaining muscle', icon: 'gym' },
      { id: 'lose', title: 'Losing fat', icon: 'flame' },
      { id: 'maintain', title: 'Maintaining my weight', icon: 'heart' },
      { id: 'none', title: 'None', icon: 'close', exclusive: true },
    ],
  },
};
